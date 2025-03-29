const micButton = document.getElementById('micButton');
const statusDiv = document.getElementById('status');
let recognition = null;
let isListening = false;

// 初始化语音识别
const initSpeechRecognition = () => {
  if (!('webkitSpeechRecognition' in window)) {
    statusDiv.textContent = '当前浏览器不支持语音识别';
    micButton.disabled = true;
    return null;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'zh-CN';
  recognition.continuous = true;  // 改为持续监听
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    handleCommand(transcript);
  };

  recognition.onerror = (event) => {
    handleRecognitionError(event.error);
  };

  recognition.onend = () => {
    if (isListening) {
      recognition.start();  // 自动重新开始监听
    }
  };

  return recognition;
};

// 错误处理
const handleRecognitionError = (error) => {
  const errorMessages = {
    'not-allowed': '错误：请允许麦克风访问权限',
    'no-speech': '未检测到语音输入',
    'audio-capture': '麦克风设备不可用'
  };
  statusDiv.textContent = errorMessages[error] || `识别错误: ${error}`;
  micButton.style.background = '#0078D4';
};

// 麦克风点击处理
micButton.addEventListener('click', async () => {
  try {
    if (isListening) {
      // 停止监听
      recognition.stop();
      isListening = false;
      micButton.style.background = '#0078D4';
      statusDiv.textContent = '已停止监听';
      return;
    }

    console.log('请求麦克风权限...');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('麦克风权限已获取');
    stream.getTracks().forEach(track => track.stop());

    if (!recognition) {
      recognition = initSpeechRecognition();
      if (!recognition) return;
    }

    recognition.start();
    isListening = true;
    statusDiv.textContent = '正在聆听...';
    micButton.style.background = '#4CAF50';
  } catch (err) {
    console.error('权限请求失败:', err);
    if (err.name === 'NotAllowedError') {
      statusDiv.textContent = '麦克风权限被拒绝，请在浏览器设置中手动开启麦克风权限';
    } else {
      statusDiv.textContent = '麦克风访问被拒绝';
    }
  }
});

// 命令执行函数
async function handleCommand(text) {
  const cmd = text.toLowerCase();

  // 网站列表
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
    'youtube': 'youtube.com'
  };

  // 导航类命令
  if (cmd.includes('打开')) {
    let siteKey = cmd.replace('打开', '').trim();
    siteKey = siteKey.replace('网站', '').trim();

    const matchedSite = Object.keys(siteMap).find(key =>
      siteKey.includes(key)
    );

    if (matchedSite) {
      const url = `https://www.${siteMap[matchedSite]}`;
      // 获取当前标签页并更新URL
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.update(tabs[0].id, { url });
          statusDiv.textContent = `正在跳转到: ${url}`;
        }
      });
      return;
    }

    // 如果没有匹配的映射，尝试直接打开
    if (siteKey) {
      const url = !siteKey.startsWith('http')
        ? `https://www.${siteKey}.com`
        : siteKey;

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.update(tabs[0].id, { url });
          statusDiv.textContent = `正在跳转到: ${url}`;
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

  } else if (cmd.includes('切换到夜间模式')) {
    try {
      const tab = await getCurrentTab();
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          document.body.style.filter = 'invert(1) hue-rotate(180deg)';
        }
      });
      statusDiv.textContent = '已切换到夜间模式';
    } catch (error) {
      console.error('执行夜间模式失败:', error);
      statusDiv.textContent = '切换夜间模式失败';
    }
  }
  else {
    statusDiv.textContent = '未识别的指令';
  }
}

// 获取当前标签页
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}