1# 🐱 懒惰猫 (LazyCat) - 语音控制浏览器扩展


# 🐱 懒惰猫 (LazyCat) - 语音控制浏览器扩展

![扩展图标](public/icon.jpg)

"懒惰猫"是一款智能语音控制浏览器扩展，让您通过中文语音命令轻松操控Microsoft Edge浏览器。所有语音处理均在本地完成，保障您的隐私安全。

[![Edge扩展商店](https://img.shields.io/badge/Edge-Add--ons-blue)](https://microsoftedge.microsoft.com/addons)

[![BiliBili](https://img.shields.io/badge/BiliBili-Add--ons-pink)](https://space.bilibili.com/41338524?spm_id_from=333.1007.0.0)

![GitHub License](https://img.shields.io/github/license/:laomoz404/:lazy-cat)

## 🌟 功能特性

### 🎙️ 语音控制
- 中文语音指令操作浏览器
- 支持自然语言表达
- 快速响应(<300ms)

### 🛠️ 主要功能
- **导航控制**："打开B站"、"访问知乎"
- **页面操作**："刷新页面"、"关闭标签页"
- **滚动控制**："向下滚动"、"滚动到底部"
- **显示模式**："夜间模式"、"恢复正常亮度"

### 🔒 隐私保护
- 100%本地语音处理
- 不上传任何语音数据
- 无痕浏览模式支持

## 🚀 快速开始

### 安装要求
- Microsoft Edge v89+ (Chromium内核)
- 麦克风设备
- 网络连接(仅用于扩展更新)

### 使用步骤
1. 点击浏览器工具栏中的懒惰猫图标
2. 点击"开始聆听"或使用快捷键(默认为Ctrl+Shift+L)
3. 说出您的指令，如："打开百度"

## ⚙️ 技术架构

graph TD
    A[语音输入] --> B[Web Speech API]
    B --> C[命令解析引擎]
    C --> D[浏览器操作执行]
    D --> E[结果反馈]

### 核心技术
- Web Speech API实现语音识别
- Edge扩展API集成
- 响应式设计架构

## 📦 项目结构

```
lazy-cat-extension/
├── public/                 # 静态资源
│   └── icon.jpg            # 扩展图标
├── sidepanel/              # 侧边栏资源
│   ├── sidepanel.html      # 侧边栏界面
│   └── sidepanel.js        # 侧边栏逻辑
├── background.js           # 后台服务
├── content.js              # 内容脚本
└── manifest.json           # 扩展清单
```

## 📜 命令参考

| 命令类别 | 示例命令 | 功能说明 |
|---------|----------|----------|
| 导航 | "打开B站" | 跳转到指定网站 |
| 页面 | "刷新当前页" | 重新加载页面 |
| 滚动 | "向下滚动" | 页面向下滚动 |
| 模式 | "夜间模式" | 切换深色主题 |

## 🛠️ 开发指南

### 构建步骤
1. 克隆仓库
   ```bash
   git clone https://github.com/yourrepo/lazy-cat-extension.git
   ```
2. 在Edge浏览器中加载解压的扩展
   - 打开 `edge://extensions`
   - 启用"开发者模式"
   - 点击"加载解压缩的扩展"

### 测试建议
- 测试不同网站上的兼容性
- 验证语音识别准确率
- 检查内存占用情况

## 🤝 贡献指南

欢迎提交Issue和Pull Request！请确保：
1. 代码符合ESLint规范
2. 新功能附带测试用例
3. 更新相关文档

## 📄 许可证

MIT License © 2025 CHESSUNYAN

---

> **温馨提示**：使用前请确保授予麦克风权限。所有语音处理均在本地浏览器中完成，不会上传任何数据。
```
