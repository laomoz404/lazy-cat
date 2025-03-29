let currentRecognition = null; // 当前语音识别实例
let audioStream = null; // 音频流


/* 初始化语音识别 */
async function initializeRecognition() {
  if (!checkPrerequisites()) return;

  try {
    // 获取麦克风权限
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 创建语音识别实例
    currentRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    configureRecognition(currentRecognition);
    // 启动识别
    currentRecognition.start();
    console.log('语音识别已启动');

  } catch (error) {
    handleInitializationError(error);
  }

  chrome.runtime.sendMessage({
    type: 'recognition-status',
    isActive: true
  }).catch(() => { });

}

// 检查运行环境
function checkPrerequisites() {
  if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
    console.error('浏览器不支持语音识别API');
    return false;
  }

  if (!window.isSecureContext) {
    console.error('语音识别需要HTTPS或localhost环境');
    return false;
  }

  return true;
}

// 配置识别参数
function configureRecognition(recognition) {
  recognition.lang = 'zh-CN';
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onstart = () => {
    console.log('识别开始');
    chrome.runtime.sendMessage({ type: 'recognition-started' });
  };

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    console.log('识别结果:', transcript);
    chrome.runtime.sendMessage({
      type: 'speech-recognition-result',
      text: transcript
    }).catch(err => console.log('发送结果失败:', err));
  };

  recognition.onerror = (event) => {
    console.error('语音识别错误:', event.error);

    // 检查扩展状态后再决定是否上报错误
    chrome.storage.sync.get(['isExtensionActive'], (result) => {
      if (result.isExtensionActive) {
        chrome.runtime.sendMessage({
          type: 'recognition-error',
          error: event.error
        });
      }
    });

    // 处理中断错误
    if (event.error === 'aborted') {
      cleanup();
      // 仅当扩展仍启用时重试
      chrome.storage.sync.get(['isExtensionActive'], (result) => {
        if (result.isExtensionActive && retryCount < MAX_RETRIES) {
          setTimeout(() => initializeRecognition(), 1000);
        }
      });
    }
  };

  recognition.onend = () => {
    console.log('识别结束');
    if (!currentRecognition) return; // 如果是手动停止则不重启
    setTimeout(() => currentRecognition.start(), 500);
  };
}

// 增强的清理函数
function cleanup() {
  console.log('正在释放语音识别资源...');

  // 停止语音识别
  if (currentRecognition) {
    currentRecognition.onend = null; // 禁用自动重启
    try {
      currentRecognition.stop();
      console.log('语音识别已停止');
    } catch (e) {
      console.error('停止语音识别时出错:', e);
    }
    currentRecognition = null;
  }

  // 关闭麦克风
  if (audioStream) {
    try {
      audioStream.getTracks().forEach(track => {
        track.stop();
        console.log('麦克风轨道已关闭');
      });
    } catch (e) {
      console.error('关闭麦克风时出错:', e);
    }
    audioStream = null;
  }

  chrome.runtime.sendMessage({
    type: 'recognition-status',
    isActive: false
  }).catch(() => { });
}

// 错误处理
function handleInitializationError(error) {
  console.error('初始化失败:', error);

  cleanup();

  if (error.name === 'NotAllowedError') {
    chrome.runtime.sendMessage({
      type: 'permission-denied'
    }).catch(err => console.log('发送权限错误失败:', err));
  }

  // 3秒后重试
  setTimeout(() => initializeRecognition(), 3000);
}

// 初始化时检查状态
chrome.runtime.sendMessage({ type: 'check-status' }, (response) => {
  if (response?.active) {
    console.log('扩展处于开启状态，启动语音识别');
    initializeRecognition();
  } else {
    console.log('扩展处于关闭状态，清理残留资源');
    cleanup();
  }
});

// 监听停止指令
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'stop-recognition') {
    console.log(`收到停止指令，原因: ${message.reason || 'unknown'}`);
    cleanup();
  }

  if (message.type === 'start-recognition' && !currentRecognition) {
    initializeRecognition();
  }

  if (message.type === 'stop-recognition' && currentRecognition) {
    cleanup();
  }

});

// 页面卸载前清理
window.addEventListener('beforeunload', cleanup);