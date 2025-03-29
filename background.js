/* 全局状态管理 */

let isExtensionActive = false; // 扩展激活状态
let retryCount = 0; // 重试计数
const MAX_RETRIES = 3; // 最大重试次数
const MAX_CONCURRENT_INJECTIONS = 3; // 最大并发注入数量

/* 安装时初始化，默认状态OFF */
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: 'OFF' });
  chrome.storage.sync.set({ isExtensionActive: false }); //储存扩展状态到本地
});

/* 从存储加载状态 */
chrome.storage.sync.get(['isExtensionActive'], (result) => {
  isExtensionActive = result.isExtensionActive || false; // 默认为false，储存中有状态变量则保持为该状态
  updateBadge(); // 更新图标状态
});

/* 点击图标切换状态 */
chrome.action.onClicked.addListener(async (tab) => {
  //切换状态
  isExtensionActive = !isExtensionActive;
  await chrome.storage.sync.set({ isExtensionActive });
  updateBadge();

  // 根据状态注入或移除脚本
  if (isExtensionActive) {
    console.log("扩展已启用");
    retryCount = 0; // 重置重试计数
    await injectAllTabs(); // 注入所有标签页
  } else {
    console.log("扩展已禁用");
    // 向所有标签页发送停止指令
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'stop-recognition',
          reason: 'extension_turned_off'
        }).catch(err => console.log(`标签页 ${tab.id} 未就绪:`, err));
      }
    }
  }
});

/* 新标签页创建时检查状态 */
chrome.tabs.onCreated.addListener(async (tab) => {
  if (isExtensionActive && tab.url?.startsWith('http')) {
    await injectScript(tab.id);
  }
});

/* 标签页更新时检查状态 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isExtensionActive && tab.url?.startsWith('http')) {
    await injectScript(tabId);
  }
});

/* 消息处理 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'check-status') {
    sendResponse({ active: isExtensionActive });
    return true;
  }

  if (message.type === 'speech-recognition-result') {
    handleCommand(message.text);
  }

  //注入失败处理，谨慎使用
  if (message.type === 'recognition-error') {
    if (message.error === 'aborted' && retryCount < MAX_RETRIES) {
      retryCount++;
      setTimeout(() => injectScript(sender.tab.id), 1000);
    }
  }

  if (message.type === 'start-recognition') {
    isExtensionActive = true;
    updateBadge();
    injectAllTabs();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'stop-recognition') {
    isExtensionActive = false;
    updateBadge();

    // 向所有标签页发送停止指令
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'stop-recognition',
            reason: 'user_request'
          }).catch(() => { });
        }
      });
    });

    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'check-recognition-status') {
    sendResponse({ isActive: isExtensionActive });
    return true;
  }
});

/* 辅助函数 */

/* 向所有标签页注入脚本 */
async function injectAllTabs() {
  const tabs = await chrome.tabs.query({});
  const promises = [];

  for (const tab of tabs) {
    if (promises.length >= MAX_CONCURRENT_INJECTIONS) {
      await Promise.race(promises);
    }

    if (tab.url?.startsWith('http')) {
      const promise = injectScript(tab.id).finally(() => {
        promises.splice(promises.indexOf(promise), 1);
      });
      promises.push(promise);
    }
  }
  await Promise.all(promises);
}


/* 向特定标签页注入脚本 */
async function injectScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    console.log(`成功注入标签页 ${tabId}`);
  } catch (error) {
    console.error(`注入标签页 ${tabId} 失败:`, error);
    chrome.notification.create({
      type: 'basic',
      title: '注入失败',
      message: `注入标签页 ${tabId} 失败: ${error.message}`
    })
  }
}


/* 扩展图标状态样式控制器 */
function updateBadge() {
  const text = isExtensionActive ? 'ON' : 'OFF';
  const color = isExtensionActive ? '#00FF00' : '#FF0000';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}



/* 命令处理函数 */
async function handleCommand(text) {

  chrome.sidePanel.setOptions({ enabled: true });
  chrome.runtime.sendMessage({
    type: 'recognition-result',
    text: text
  }).catch(() => { });

  const cmd = text.toLowerCase();

  const siteMap = {
    'b站': 'bilibili.com',
    '哔哩哔哩': 'bilibili.com',
    '百度': 'baidu.com',
    '谷歌': 'google.com',
    '知乎': 'zhihu.com',
    '淘宝': 'taobao.com',
    '京东': 'jd.com',
    '腾讯': 'qq.com',
    '微博': 'weibo.com',
    'github': 'github.com',
    'youtube': 'youtube.com',
    '微信': 'weixin.qq.com',
    '豆瓣': 'douban.com',
    '网易': '163.com',
    '新浪': 'sina.com.cn'
  };

  // ====1. 基础功能====
  if (cmd.includes('打开')) {
    let siteKey = cmd.replace('打开', '').trim();
    siteKey = siteKey.replace('网站', '').trim();

    const matchedSite = Object.keys(siteMap).find(key =>
      siteKey.includes(key)
    );

    if (matchedSite) {
      const url = `https://www.${siteMap[matchedSite]}`;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.update(tabs[0].id, { url });
          console.log(`正在跳转到: ${url}`);
          speakFeedback(`已打开${matchedSite}`);
        }
      });
      return;
    }

    if (siteKey) {
      const url = !siteKey.startsWith('http')
        ? `https://www.${siteKey}.com`
        : siteKey;

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.update(tabs[0].id, { url });
          console.log(`正在跳转到: ${url}`);
        }
      });
      return;
    }
  } else if (cmd.includes('刷新')) {
    chrome.tabs.reload();

  } else if (cmd.includes('关闭标签页')) {
    chrome.tabs.query({ active: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.remove(tabs[0].id);
    });

  }

  // ====2. 搜索功能====

  else if (cmd.includes('搜索')) {
    const query = cmd.replace('搜索', '').trim();
    if (query) {
      await navigateToUrl(`https://www.baidu.com/s?wd=${encodeURIComponent(query)}`);
    }
  }

  // ====3. 主题功能 ====

  else if (cmd.includes('夜间模式') || cmd.includes('深色模式')) {
    try {
      const tab = await getCurrentTab();
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          document.body.style.filter = 'invert(1) hue-rotate(180deg)';
        }
      });
      speakFeedback('已切换到夜间模式');
      console.log('已切换到夜间模式');
    } catch (error) {
      console.error('执行夜间模式失败:', error);
    }
  }

  // ====6. 实用工具功能====

  else if (cmd.includes('滚动到顶部')) {
    await scrollToTop();
    speakFeedback('已滚动到页面顶部');
  }

  else if (cmd.includes('滚动到底部')) {
    await scrollToBottom();
    speakFeedback('已滚动到页面底部');
  }

  else if (cmd.includes('向下滚动') || cmd.includes('往下滚动')) {
    await scrollDown();
    speakFeedback('已向下滚动');
  }

  else if (cmd.includes('向上滚动') || cmd.includes('往上滚动')) {
    await scrollUp();
    speakFeedback('已向上滚动');
  }


  //结束点

  else {
    console.log('未识别的指令');
  }
}


/* 获取当前标签页 */
const getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
};



//功能方法实现

/* 语音合成方法 */
function speakFeedback(text) {
  //tts语音合成默认关闭，如果需要自行开启，把下面的注释去掉
  console.log("语音tts合成未开启");
  //chrome.tts.speak(text, { rate: 1.0 }); //rate控制音量 0-1之间
}

async function scrollToTop() {
  const tab = await getCurrentTab();
  if (tab) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.scrollTo(0, 0)
    });
  }
}

async function scrollToBottom() {
  const tab = await getCurrentTab();
  if (tab) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.scrollTo(0, document.body.scrollHeight)
    });
  }
}

async function scrollDown() {
  const tab = await getCurrentTab();
  if (tab) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.scrollBy(0, window.innerHeight * 0.8)
    });
  }
}

async function scrollUp() {
  const tab = await getCurrentTab();
  if (tab) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.scrollBy(0, -window.innerHeight * 0.8)
    });
  }
}

/**
 * 语音搜索
 * @param {string} url - 要导航到的URL
 * @param {number} [tabId] - 可选的目标标签页ID
 */
async function navigateToUrl(url, tabId) {
  try {
    if (tabId) {
      await chrome.tabs.update(tabId, { url });
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.update(tab.id, { url });
      } else {
        await chrome.tabs.create({ url });
      }
    }
    console.log(`导航到: ${url}`);
  } catch (error) {
    console.error(`导航到 ${url} 失败:`, error);
    throw error;
  }
}