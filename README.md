<div align="center">

# 本语 / LocalLLM Studio

### 本地 llama.cpp 的克制桌面端

<br/>

[![Version](https://img.shields.io/badge/version-1.1.2026.06.15-08090A?style=flat-square&labelColor=fafafa&color=08090A)](#)
[![Platform](https://img.shields.io/badge/Windows-10%2F11-08090A?style=flat-square&labelColor=fafafa&color=08090A)](#)
[![Electron](https://img.shields.io/badge/Electron-41-08090A?style=flat-square&labelColor=fafafa&color=08090A)](#)
[![React](https://img.shields.io/badge/React-19-08090A?style=flat-square&labelColor=fafafa&color=08090A)](#)
[![MIT](https://img.shields.io/badge/license-MIT-08090A?style=flat-square&labelColor=fafafa&color=08090A)](LICENSE)

<br/>

无命令行,管理本地 AI 服务。内置流式聊天、OpenAI 兼容接口、知识库检索、系统托盘后台运行。  
全 app 黑白灰,token 驱动,Linear 风。

[界面预览](https://linkin770.github.io/LocalLLM-Studio/) · [快速开始](#-快速开始) · [更新日志](#-更新日志)

</div>

---

## ✨ 这是什么

`本语 / LocalLLM Studio` 是一个 Electron + React 桌面应用,把 [llama.cpp](https://github.com/ggml-org/llama.cpp) 的本地服务封装成一个**克制、干净、不会打扰你**的 Windows 端控制台。

它做三件事:
- **跑服务** —— 启动 / 停止 llama-server,健康检查,实时日志
- **聊模型** —— 内置流式聊天界面,Markdown、代码高亮、上下文使用率
- **接外部** —— 暴露标准 `/v1/chat/completions` 流式接口,可被 Claude Code / OpenClaw / 任何 OpenAI 客户端调用

---

## 🎨 视觉预览

在线实时预览:**👉 [https://linkin770.github.io/LocalLLM-Studio/](https://linkin770.github.io/LocalLLM-Studio/)**

包含:
- 4 个真实 UI 高保真还原(对话·欢迎 / 设置·概览 / 知识库 / 对话·详情),可切换 tab
- 颜色 / 字体 / 组件 token 体系
- v1.0 → v1.1 的视觉收口变更
- 浅色 / 深色双主题切换(☀/☾,带 `localStorage` 记忆)
- 7 套动效:滚动揭示、tab 切换、log 实时流、进度条入场、状态圆点呼吸、主题过渡、按钮 spring 按下
- 一键复制启动命令(Clipboard API)

源文件在仓库的 [`design-preview/`](design-preview/) 目录,本地用浏览器打开 `design-preview/index.html` 也能跑(零依赖)。

---

## 🆕 v1.1 变化

**视觉**
- 设置面板从 **模态弹窗 → 全页式视图**(由 `state.view` 路由)
- 三栏布局:左 240px 导航 + 主区 1fr
- 沿用主页 HeaderBar 作顶部 chrome(‹ 折叠 + — □ × 窗控)
- Linear 风控件:12px 卡片圆角、hairline 边框、`scale(0.97)` active
- 启动命令块:纯黑底 + 3px 渐变发光条 + Geist Mono + 一键复制
- 日志面板:`data-level` 驱动绿 / 橙 / 红 / 灰 5px 圆点
- 卡片入场:`fadeUp` 320ms + 50ms 错峰,尊重 `prefers-reduced-motion`
- 主页"终端"导航项移除(相关功能已在设置 → 日志 tab)

**字体集成**
- 引入 Google Fonts 的 `Geist` / `Geist Mono` / `Fraunces`
- 全局 `font-family` 字体栈更新
- 中文字体仍走 MiSans / PingFang SC,与英文系统和谐共存

---

## 🚀 核心功能

### 1. 完整 llama.cpp 集成
- 启动 / 停止 `llama-server`,支持 Direct 模式(推荐)与 Launcher 模式
- 健康检查(检测 `server is listening`)
- 实时日志,ANSI 颜色已过滤,可直接看真正的 llama.cpp 输出
- 系统托盘后台运行,窗口最小化后服务继续工作
- 启动命令预览,一键复制

### 2. OpenAI 兼容接口
- 标准 `/v1/chat/completions` 流式接口
- 可接入任何 OpenAI 兼容客户端
- Base URL:`http://127.0.0.1:8080/v1`
- API Key:任意字符串(本地服务无需验证)

### 3. 内置聊天界面
- 流式回复,实时 Markdown 渲染
- 代码高亮(Ant Design X CodeHighlighter)
- 上下文使用率环形进度条(绿 < 50% · 黄 50-75% · 红 > 75%)
- 多标签会话(浏览器风格 Tab)
- 历史对话搜索、按时间分组
- 系统提示词(每会话独立,持久化)
- 技能系统(SKILL.md,Claude Code 兼容)

### 4. 视觉投影(mmproj)
- 多模态模型支持
- 自动扫描 `models/` 文件夹,智能匹配主模型与投影文件
- 服务运行中切换模型自动重启

### 5. 本地知识库
- TF-IDF 全文检索(零外部依赖)
- 支持 PDF / Word / Excel / TXT / MD
- 自动分块,智能注入 system prompt
- 解析进度实时显示

### 6. 完整采样与运行参数
- 上下文长度、GPU 层数、温度、Top-K/P、重复惩罚
- 所有 llama-server 参数可在 UI 中调整
- 配置 TOML 导入 / 导出

---

## 📋 系统要求

| 项目      | 要求                              |
| ------- | ------------------------------- |
| 操作系统    | Windows 10 / 11 (64 位)           |
| Node.js | >= 18.0.0                       |
| 内存      | 建议 >= 16GB(视模型大小而定)           |
| GPU     | 可选,支持 CUDA / Vulkan 加速        |

---

## 🚀 快速开始

### 方式一:源码运行

```powershell
git clone https://github.com/linkin770/illama-desktop.git
cd illama-desktop
npm install
npm start
```

### 方式二:下载预编译包

1. 从 [Releases](https://github.com/linkin770/LocalLLM-Studio/releases) 下载
2. 解压后运行 `本语 · LocalLLM Studio.exe`

### 准备 llama.cpp

由于 llama.cpp 体积较大,本仓库不包含编译产物。请自行下载:

1. 访问 [llama.cpp 官方发布页面](https://github.com/ggml-org/llama.cpp/releases)
2. 下载 Windows 版本的发布包(如 `llama.cpp-win-cuda.zip`)
3. 解压后将所有文件复制到项目的 `llama/` 文件夹中

确保 `llama/` 包含:
- `llama-server.exe` — 主服务程序
- `llama.dll` — 核心推理库
- `ggml*.dll` — ggml 推理库
- `cublas*.dll` / `cudart*.dll` — CUDA 支持库(GPU 版本)

### 第一次启动

1. 点击侧栏「设置」
2. 在「展示」选项卡选择 GGUF 模型文件
3. (可选)配置 mmproj 投影文件
4. 点击底部「启动服务」
5. 状态变为「运行中」后开始聊天,或用任何 OpenAI 客户端连接

---

## 📖 使用说明

### 模型与启动
- **配置文件**:在设置中选择 GGUF 模型路径、llama.cpp 目录、mmproj 路径
- **启动模式**:Direct 模式(直接启动 `llama-server.exe`,推荐)或 Launcher 模式
- **启动参数**:可在「开发者」tab 调整 `n_gpu_layers` / `ctx_size` / 线程数等
- **采样参数**:在「采样与惩罚」tab 调整 `temp` / `top_p` / `top_k` / 重复惩罚

### 接入外部客户端
将以下 URL 配置到支持 OpenAI API 的客户端中:
- **Base URL**: `http://127.0.0.1:8080/v1`
- **API Key**: 任意字符串(本地服务无需验证)

例如 Claude Code、OpenClaw、Continue、Cline、LobeChat、NextChat 等都可以直接接入。

### 技能(Skills)
1. 在设置 → 「技能」tab 中新建技能
2. 填写名称、描述,点击「生成 SKILL.md」由本地模型自动生成完整 SKILL.md
3. 回到聊天界面,点击输入框旁的 🔧 按钮选择技能
4. 技能标签出现在输入框上方,每次发送都会将 SKILL.md 注入到 system 消息最前面
5. 技能绑定当前会话,切换会话后自动隐藏,切回后自动恢复

### 知识库
1. 在「知识库」视图上传 PDF / Word / Excel / TXT / MD
2. 文档异步解析、自动分块、TF-IDF 索引
3. 开启后,发送消息时自动检索相关片段,作为 system prompt 注入

### 技能文件格式
```markdown
---
name: 技能名称
description: 简要描述
whenToUse: 触发条件说明
argumentHint: 参数提示
---

系统提示词正文...

${ARGUMENTS}
```

---

## 🏗️ 项目结构

```
LocalLLM-Studio/
├── assets/                  # 图标和资源
│   ├── LocalLLM.png
│   ├── LocalLLM.ico
│   └── LocalLLM-tray.png
├── design-preview/          # 设计预览(浏览器可独立打开)
│   ├── index.html           # 入口(纯 HTML,无构建)
│   ├── css/main.css         # Token + 样式 + 关键帧
│   └── js/main.js           # 交互与动效
├── desktop/                 # Electron 主进程
│   ├── main.mjs             # 主入口(模块装配 + 生命周期)
│   ├── preload.cjs          # 预加载(渲染进程桥接)
│   ├── core/                # 核心模块
│   │   ├── app-state.mjs
│   │   ├── config-manager.mjs
│   │   └── window-manager.mjs
│   ├── ipc/                 # IPC 处理器
│   │   ├── chat-handler.mjs
│   │   ├── file-dialog.mjs
│   │   ├── knowledge-manager.mjs
│   │   ├── model-scanner.mjs
│   │   ├── server-manager.mjs
│   │   └── skill-manager.mjs
│   ├── tray/
│   │   └── tray-manager.mjs
│   └── utils/               # 工具与参数
│       ├── file-utils.mjs
│       ├── model-utils.mjs
│       ├── server-args.mjs
│       ├── documentParser.mjs
│       ├── textChunker.mjs
│       └── tfidf.mjs
├── renderer/                # React 渲染进程
│   ├── src/
│   │   ├── App.tsx          # 主应用
│   │   ├── main.tsx         # 入口
│   │   ├── components/      # UI 组件
│   │   │   ├── ChatScreen.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatNav.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── SettingsPanel.tsx
│   │   │   ├── KnowledgeBasePanel.tsx
│   │   │   ├── HeaderBar.tsx
│   │   │   ├── TabBar.tsx
│   │   │   ├── ModelInfoModal.tsx
│   │   │   ├── SystemPromptModal.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── primitives/  # 设计系统原语
│   │   ├── hooks/
│   │   │   └── useAppState.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── index.ts
│   │   └── theme.ts
│   ├── styles/              # CSS(按模块拆分)
│   │   ├── variables.css    # 设计 Token 单一来源
│   │   ├── base.css
│   │   ├── layout.css
│   │   ├── sidebar.css
│   │   ├── chat.css
│   │   ├── composer.css
│   │   ├── settings.css
│   │   ├── forms.css
│   │   ├── components.css
│   │   ├── extra.css
│   │   └── ...
│   ├── assets/fonts/        # MiSans 字体
│   ├── index.html
│   └── dist/                # esbuild 产物
├── llama/                   # llama.cpp 编译产物(需自行下载)
├── skills/                  # 技能 SKILL.md 存储
├── data/knowledge/          # 知识库文档与索引
├── models/                  # GGUF 模型文件
├── scripts/
│   └── build-renderer.js    # esbuild 构建
├── package.json
├── package-lock.json
├── tsconfig.json
├── electron-builder.yml
└── README.md
```

---

## 🧱 核心技术栈

| 组件               | 版本      | 说明                  |
| ---------------- | ------- | ------------------- |
| Electron         | 41.1.1  | 跨平台桌面应用框架          |
| React            | ^19.2.6 | UI 框架               |
| TypeScript       | ^6.0.3  | 类型安全                |
| Ant Design X     | ^2.7.0  | 对话 UI 组件库           |
| esbuild          | ^0.28.0 | 渲染进程构建              |
| electron-builder | 26.8.1  | 打包工具                |
| pdf-parse        | ^1.1.1  | PDF 文本提取            |
| word-extractor   | ^1.0.4  | Word 文档解析           |
| xlsx             | ^0.18.5 | Excel 表格解析          |

---

## ⚙️ 配置参数

| 参数                 | 说明          | 默认值     |
| ------------------ | ----------- | ------- |
| `host`           | 服务绑定地址      | 0.0.0.0 |
| `port`           | 服务端口        | 8080    |
| `ctx_size`       | 上下文窗口大小     | 32768   |
| `n_predict`      | 最大输出 tokens | -1      |
| `n_gpu_layers`   | GPU 加速层数    | 99      |
| `temp`           | 温度参数        | 0.8     |
| `top_p`          | Top-P 采样    | 0.95    |
| `top_k`          | Top-K 采样    | 20      |
| `mmproj`         | 视觉投影文件路径    | —       |

---

## 🛠️ 开发命令

```powershell
# 启动开发模式(构建 + 启动 Electron)
npm start

# 仅构建渲染进程
npm run build

# 打包便携版
npm run dist

# 类型检查
npx tsc --noEmit

# 运行测试
npm test
```

---

## 📝 更新日志

### v1.0.2026.06.15 (2026-06-15)

**对话系统全面修复 · 11 项关键 bug**

#### 🐛 关键修复
- 修复 `buildChatMessages` 中 `localOnly` 过滤位置错误,system message 真正发送给 LLM(会话提示词 / 技能 / 知识库此前从未生效)
- 切会话/关标签/新建/删除会话时中断流,流式事件按 `sessionId` 路由,旧流不再污染新会话
- `deleteMessage` 在删除前先 `abortChat`,`handleEvent` 增加目标消息校验,流式 delta 不再写入已删除的消息
- 编辑 user 消息级联截断:中断流 → 截断到该 user(含) → 内容回填输入框 + 恢复附件
- 删除消息级联配对:删 assistant 同时删前一条 user,删 user 同时删后一条 assistant(内容回输入框)
- 首次设置提示词不生效(新会话尚未加入 `sessions` 数组)
- 错误消息不再写入 `chatMessages`,改用 toast 提示,用户可直接"重新生成"重试
- 知识库短查询过滤(查询长度 < 2 字符不触发检索,避免"1"等误命中)
- `retryMessage` 依赖数组补全(`currentSessionPrompt` / `selectedSkill`)

#### ⚡ 健壮性提升
- `chatBusyRef` 即时锁,`sendChat` / `retryMessage` 入口防止同帧双发
- `abortChat` / `useAppState` 切会话操作中 `chatBusyRef` 正确同步
- `ChatMessage` 的 `key` 从 `index` 改为 `${role}-${createdAt}`,DOM 正确复用
- 删除消息 `Modal.confirm` 二次确认(居中,红色危险按钮)

#### 🔧 内部调整
- 修复 `preload.cjs` 中 `abortChat` 通道名 `ll:chat-abort` → `ll:abort-chat`
- `streamChat` API 加 `sessionId?` 字段,主进程 `sendEvent` 附带 `sessionId`

---

### v1.1.2026.06.09 (2026-06-09)

**视觉收口 · Linear-style 全页化** —— 设置面板从模态弹窗改为全页式视图,三栏 shell(240px 导航 + 1fr 主区),Linear 风控件(12px 圆角 / hairline / `scale(0.97)` active),启动命令块(纯黑底 + 3px 渐变发光条 + Geist Mono),日志面板 `data-level` 驱动级别色点,卡片入场 320ms fadeUp + 50ms 错峰,引入 Google Fonts(Geist / Geist Mono / Fraunces),删除 `TerminalPanel.tsx` 死代码,新增 `design-preview/` 独立设计预览。

### v1.0.2026.06.08 (2026-06-08)

**UI 全面 Linear-style 重构** —— 从米绿色 + 紫蓝渐变转向纯黑 / 灰 + 软光晕的现代极简风,建立 v2 token 体系(`variables.css` 集中重写 45+ token,深色模式 token 整合),主进程全面模块化重构(`main.mjs` 2480 → 131 行),设置面板 / 知识库 / 按钮 / 状态指示按 Linear 风重做。

### v1.0 系列早期版本(2026.05.16 ~ 2026.06.07)

- **v1.0.2026.06.07** 主进程拆分为 14 个职责单一模块
- **v1.0.2026.05.31** 引入本地 TF-IDF 知识库(支持 PDF / Word / Excel / TXT / MD)
- **v1.0.2026.05.30** 智能模型选择器(自动匹配主模型与 mmproj)
- **v1.0.2026.05.27** 每会话独立对话提示词系统
- **v1.0.2026.05.26** 自定义标题栏 + 浏览器风格多标签
- **v1.0.2026.05.25** 代码清理(删除 11 个未用工具函数,移除 `fs-extra` / `pdfjs-dist`)
- **v1.0.2026.05.23** 技能系统(SKILL.md / Claude Code 格式兼容)
- **v1.0.2026.05.22** 附件菜单整理
- **v1.0.2026.05.20** Markdown 实时渲染 + 代码高亮
- **v1.0.2026.05.19** 视觉净化(白底 + 中性强调色)
- **v1.0.2026.05.16** React 19 + TypeScript 全面重构

---

## 📄 许可证

MIT License —— 详见 [LICENSE](LICENSE)

---

## 🤝 致谢

本项目基于以下优秀的开源项目:

- [llama.cpp](https://github.com/ggml-org/llama.cpp) —— 高效的本地 LLM 推理引擎
- [Ant Design X](https://x.ant.design/) —— React 组件库
- [Geist / Geist Mono / Fraunces](https://vercel.com/font) —— 字体支持

> 早前版本参考过 [illama-cpp-desktop](https://github.com/Qiao-920/llama-cpp-desktop) 的部分目录排布方案,经过多轮重构,当前版本的主进程、IPC、React 渲染、状态管理、设计系统均已**完全重写**,与原项目仅在结构命名上存在少量相似性。

感谢所有开源作者的贡献。

---

<div align="center">

**💖 亲爱的袁袁袁大王**

</div>
