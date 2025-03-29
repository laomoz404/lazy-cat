// 控制语音识别状态
let isListening = false;
const toggleBtn = document.getElementById('toggleListening');
const statusDiv = document.getElementById('status');

// 与background script通信
async function sendMessageToBackground(type, data = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...data }, (response) => {
      resolve(response);
    });
  });
}

// 更新UI状态
function updateUI() {
  if (isListening) {
    toggleBtn.textContent = '停止聆听';
    toggleBtn.style.backgroundColor = '#f44336';
    statusDiv.textContent = '状态: 聆听中...';
  } else {
    toggleBtn.textContent = '开始聆听';
    toggleBtn.style.backgroundColor = '#4CAF50';
    statusDiv.textContent = '状态: 待机中';
  }
}

// 切换监听状态
toggleBtn.addEventListener('click', async () => {
  isListening = !isListening;
  updateUI();
  
  if (isListening) {
    await sendMessageToBackground('start-recognition');
  } else {
    await sendMessageToBackground('stop-recognition');
  }
});

// 接收来自background的状态更新
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'recognition-status') {
    isListening = message.isActive;
    updateUI();
  }
  
  if (message.type === 'recognition-result') {
    statusDiv.textContent = `识别到: ${message.text}`;
    setTimeout(() => {
      if (!isListening) statusDiv.textContent = '状态: 待机中';
    }, 3000);
  }
});

// 初始化检查状态
(async function init() {
  const { isActive } = await sendMessageToBackground('check-recognition-status');
  isListening = isActive;
  updateUI();
})();