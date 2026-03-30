# 📖 Nano EPUB Reader

基于 **Alpine.js** 的极简 PC 端 EPUB 阅读器，声明式编程，代码量减少 60%。

## ✨ 特性

- **Alpine.js** - 轻量级响应式框架，无虚拟 DOM，直接操作真实 DOM
- **极简架构** - 零构建工具，CDN 引入，开箱即用
- **PC 端优化** - 左右分栏，目录常驻，单章节滚动阅读
- **声明式编程** - HTML 中直接描述状态和交互，代码更易维护

## 🚀 使用方法

1. 下载本项目
2. 用浏览器直接打开 `index.html`
3. 拖拽或点击上传 EPUB 文件

## 📦 部署到 GitHub Pages

1. Fork 本仓库
2. Settings → Pages → Deploy from a branch → main → / (root)
3. 访问 `https://你的用户名.github.io/nano-epub`

## 🎯 功能

| 功能 | 说明 |
|------|------|
| 📂 EPUB 阅读 | 本地解析，不上传服务器 |
| 📑 目录导航 | 可展开/收起，点击跳转 |
| ⬆⬇ 章节切换 | 底栏快速切换 |
| 🎨 主题切换 | 亮色 / 暗色 / 护眼 |
| 🔤 字体调节 | 12-28px |
| ↔️ 宽度调节 | 400-1200px |
| 💾 **配置持久化** | **刷新/重启后设置不丢失** |
| 📌 **阅读进度保存** | **自动记录每本书的阅读位置** |

## ⌨️ 快捷键

| 按键 | 功能 |
|------|------|
| ↑↓ / PageUp/PageDown | 滚动阅读 |
| 空格 | 向下滚动 |
| Home/End | 章节首尾 |

## 🛠️ 技术栈

- **Alpine.js** 3.14 - 响应式框架
- **Alpine Collapse** - 折叠动画插件
- **EPUB.js** 0.3.93 - EPUB 解析渲染
- **JSZip** 3.10 - ZIP 解压


## 💾 配置持久化

所有设置和阅读进度自动保存到浏览器 **localStorage**：

### 保存的配置项
```json
{
  "theme": "dark",           // 主题
  "fontSize": 20,            // 字体大小
  "readerWidth": 900,        // 阅读栏宽度
  "readingProgress": {       // 每本书的阅读进度
    "三体_1234567": 15,      // 书名_文件大小: 章节索引
    "百年孤独_8901234": 8
  }
}
```

### 特性
- ✅ 刷新页面后配置不丢失
- ✅ 重新打开浏览器后自动恢复
- ✅ 每本书独立保存阅读进度
- ✅ 定期自动保存（每 30 秒）
- ✅ 点击 ↺ 可重置所有设置

## 📝 Alpine.js 优势示例

### 原生 JS（命令式）
```javascript
// 50+ 行代码
const state = { fontSize: 18 };
$('fontBtn').addEventListener('click', togglePanel);
$('increase').addEventListener('click', () => {
    state.fontSize++;
    $('fontSizeDisplay').textContent = state.fontSize;
    updateRendition();
});
```

### Alpine.js（声明式）
```html
<!-- 5 行代码 -->
<button @click="settingsOpen = !settingsOpen">A 字号</button>
<div x-show="settingsOpen">
    <button @click="fontSize--">A-</button>
    <span x-text="fontSize"></span>
    <button @click="fontSize++">A+</button>
</div>
```

状态变化自动同步到 DOM，无需手动操作。

## 📂 文件结构

```
.
├── index.html      # 主页面 + Alpine 组件模板
├── css/style.css   # 样式
├── js/app.js       # Alpine 数据组件
└── README.md
```

## 🔒 隐私

所有文件本地解析，**不上传任何服务器**。

## 📄 License

MIT
