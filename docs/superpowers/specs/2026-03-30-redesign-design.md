# Redesign — 基于 Web Component 的设计稿开发工具

## 概述

Redesign 是一个 CLI 工具，让用户使用纯 HTML + CSS + Web Component 来编写设计稿。用户在一个 `design/` 目录中组织设计稿文件，通过 `design.yaml` 描述元信息。CLI 启动一个开发服务器，提供类 Figma 的三栏编辑器界面来预览和检查设计稿。

## 核心概念

### Design 目录

任意目录均可作为 design 目录，只要包含一个 `design.yaml`。design 目录不是 npm 包，不属于 CLI 代码的一部分。

### design.yaml 格式

```yaml
version: 1.0
global-style: "global.css"

components:
  my-banner:
    template: "components/banner/banner.html"
    style: "components/banner/banner.css"

pages:
  cover:
    template: "pages/cover/cover.html"
    style: "pages/cover/cover.css"
  example:
    template: "pages/example/example.html"
    style: "pages/example/example.css"
```

**规则：**
- `components` 和 `pages` 均为 map 格式（key-value），不是数组
- components 的 key 即为 Web Component 的 tag name，**必须包含连字符**（Web Component 规范要求），否则启动时报错
- pages 的 key 作为页面标识符，用于 URL 路由（如 `/page/cover`）
- 所有 `template` 和 `style` 路径相对于 design.yaml 所在目录
- `global-style` 为全局样式文件，应用于所有页面

### 组件模板格式

组件的 HTML 文件使用 `<template>` 标签：

```html
<!-- components/banner/banner.html -->
<template>
  <div class="banner">
    <slot></slot>
  </div>
</template>
```

组件使用 Shadow DOM 进行样式隔离。组件的 CSS 文件内容会被注入到 Shadow DOM 内部。

### 页面格式

页面的 HTML 文件是纯 HTML 片段（不包含 `<html>`、`<head>`、`<body>` 标签），可以直接使用已注册的 Web Component：

```html
<!-- pages/cover/cover.html -->
<div class="cover-page">
  <my-banner>Welcome to the Design</my-banner>
  <p>This is the cover page.</p>
</div>
```

**限制：** 页面和组件都是纯静态设计稿，不支持用户编写 `<script>` 标签。

## 架构

### 双服务器架构

CLI 运行时启动两个服务器：

1. **Editor Server**（如端口 3000）— 静态文件服务器，托管预构建的 React 编辑器 UI
2. **Design Server**（如端口 3001）— Vite dev server，处理 design 页面的解析、组装和 HMR

**选择双服务器的原因：** CLI 发布后，React 编辑器 UI 已经是构建产物（`vite build` 的输出），不需要 Vite dev server。只有用户的 design 文件在不断编辑，需要 HMR 支持。

### 启动流程

```
用户执行: redesign -c design.yaml
  │
  ├── 1. 解析命令行参数
  ├── 2. 读取并校验 design.yaml
  │     ├── 检查所有 template/style 文件存在
  │     └── 检查所有 component key 包含连字符
  ├── 3. 启动 Design Server (Vite, 端口 3001)
  ├── 4. 启动 Editor Server (静态, 端口 3000)
  │     └── 提供 /api/config 接口返回 design 配置
  └── 5. 打开浏览器 http://localhost:3000
```

### 数据流

```
Browser (localhost:3000)
  │
  ├── GET / → Editor Server → 编辑器 index.html + React bundle
  ├── GET /api/config → Editor Server → design 配置 JSON
  │     (页面列表、组件列表、design server 地址)
  │
  └── iframe src="http://localhost:3001/page/cover"
        │
        └── GET /page/cover → Design Server (Vite)
              → 组装完整 HTML 页面
              → Vite HMR 监听文件变更
```

## Design Server 详细设计

### Vite 插件

编写一个 Vite 插件 `vite-plugin-redesign`，负责：

1. **路由拦截**：拦截 `/page/:pageName` 请求
2. **HTML 组装**：读取对应 page 的 template 和 style，连同全局样式和组件注册脚本，生成完整 HTML
3. **文件监听**：监听 design 目录下文件变更，触发 HMR 刷新

### 组装的 HTML 结构

当请求 `/page/cover` 时，返回：

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/@design/global.css">
  <link rel="stylesheet" href="/@design/pages/cover/cover.css">
</head>
<body>
  <!-- page 内容（用户编写的纯 HTML） -->
  <div class="cover-page">
    <my-banner>Welcome</my-banner>
  </div>

  <!-- CLI 注入的脚本 -->
  <script type="module">
    // 1. 注册所有 Web Components
    // 2. 节点选中通信脚本（postMessage）
  </script>
</body>
</html>
```

### Web Component 注册逻辑

对 `design.yaml` 中定义的每个 component，生成注册代码：

```js
class MyBanner extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `/* banner.css 内容 */`;
    shadow.appendChild(style);

    const template = document.createElement('template');
    template.innerHTML = `/* banner.html <template> 内部的内容 */`;
    shadow.appendChild(template.content.cloneNode(true));
  }
}
customElements.define('my-banner', MyBanner);
```

### HMR 策略

- 组件/页面 HTML 或 CSS 文件变更 → 触发 iframe 内页面整体刷新（full reload）
- `design.yaml` 变更 → 重新解析配置 → 触发编辑器页面整体刷新（通过 Vite 的 full reload 机制通知 iframe，iframe 刷新后编辑器重新请求 `/api/config` 获取最新配置）

## 编辑器 UI 设计

### 技术栈

- React（构建时使用 Vite，产物为静态文件）
- 运行时由 Editor Server 静态托管

### 三栏布局

```
┌──────────────┬────────────────────────┬──────────────┐
│  左栏 240px   │     中间画布（flex:1）   │  右栏 280px   │
│              │                        │              │
│ ▼ Pages      │  ┌──────────────────┐  │  Tag: div    │
│   Cover  ◄── │  │                  │  │  Class: card │
│   Example    │  │   iframe         │  │              │
│              │  │   (design page)  │  │  Styles:     │
│ ▼ Layers     │  │                  │  │  width: 200  │
│   <body>     │  │                  │  │  height: 100 │
│     <my-b..> │  └──────────────────┘  │  padding: 8  │
│       <div>  │                        │  color: #333 │
│     <p>      │                        │              │
└──────────────┴────────────────────────┴──────────────┘
```

### 左栏：PageTree + LayerTree

**PageTree（上半部分）：**
- 从 `/api/config` 获取页面列表
- 展示所有 page 的 key 作为可点击项
- 点击切换 iframe 的 src 到对应页面

**LayerTree（下半部分）：**
- 通过 postMessage 从 iframe 获取当前页面的 DOM 树结构
- 树形展示，每个节点显示标签名和关键属性（class 等）
- 点击节点 → 高亮 iframe 中对应元素 + 右栏显示其属性
- 与 iframe 中的元素选中保持双向同步

### 中间：Canvas

- 一个 `<iframe>`，src 指向 Design Server 的 `/page/:pageName`
- iframe 内注入的脚本监听：
  - `click` 事件 → `postMessage` 报告选中节点信息
  - `mouseover` 事件 → `postMessage` 报告 hover 节点（用于高亮预览）
- 选中元素显示蓝色边框高亮（通过 outline 或 overlay 实现）

### 右栏：PropertyPanel

只读展示选中节点的信息：
- **Element**：标签名（如 `<my-banner>`）
- **Attributes**：id、class、自定义属性等
- **Computed Styles**：通过 `getComputedStyle()` 获取的关键样式属性
  - 布局：width、height、padding、margin、display、position
  - 视觉：background、color、border、border-radius、opacity
  - 文字：font-family、font-size、font-weight、line-height
- **Box Model**：可视化展示 margin/border/padding/content 盒模型

### 编辑器与 iframe 通信协议

使用 `postMessage` 通信：

**Editor → iframe：**
- `{ type: 'GET_DOM_TREE' }` — 请求 DOM 树结构
- `{ type: 'HIGHLIGHT_NODE', path: string }` — 高亮指定节点
- `{ type: 'CLEAR_HIGHLIGHT' }` — 清除高亮

**iframe → Editor：**
- `{ type: 'DOM_TREE', tree: DOMNode[] }` — 返回 DOM 树
- `{ type: 'NODE_SELECTED', node: NodeInfo }` — 用户点击选中节点
- `{ type: 'NODE_HOVERED', node: NodeInfo }` — 用户 hover 节点

```ts
interface NodeInfo {
  tagName: string;
  path: string;          // 用于定位节点的路径
  attributes: Record<string, string>;
  computedStyles: Record<string, string>;
  boundingRect: DOMRect;
}
```

## 项目结构

```
cli/
├── package.json
├── tsconfig.json
├── bin/
│   └── redesign.ts              # CLI 入口
├── src/
│   ├── server/
│   │   ├── index.ts             # 启动两个服务器
│   │   ├── editor-server.ts     # 静态文件服务器
│   │   ├── design-server.ts     # Vite dev server 封装
│   │   └── vite-plugin.ts       # Vite 插件
│   ├── parser/
│   │   └── yaml.ts              # design.yaml 解析与校验
│   └── shared/
│       └── types.ts             # 共享类型定义
├── editor/                      # React 编辑器 UI
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── PageTree.tsx
│       │   ├── LayerTree.tsx
│       │   ├── Canvas.tsx
│       │   └── PropertyPanel.tsx
│       └── hooks/
│           └── useDesignData.ts
└── dist/
    └── editor/                  # 编辑器构建产物
```

## CLI 接口

```
redesign -c <path>    启动开发服务器
  -c, --config        design.yaml 文件路径（必需）
  -p, --port          编辑器端口（默认 3000）
  --design-port       design 服务器端口（默认 3001）
```

## 校验规则

启动时校验 `design.yaml`：
- `version` 字段存在
- `global-style` 指定的文件存在
- 每个 component 的 key 包含连字符（Web Component 规范）
- 每个 component/page 的 `template` 和 `style` 文件存在
- 无重复的 component key 或 page key

校验失败时输出明确的错误信息并退出。

## 技术选型

| 部分 | 技术 |
|------|------|
| CLI 框架 | 简单 arg 解析（minimist 或手写） |
| Design Server | Vite (`createServer` API) + 自定义插件 |
| Editor Server | Node.js 原生 HTTP 或 sirv 等轻量静态服务 |
| 编辑器 UI | React + Vite（开发时）→ 静态产物（运行时） |
| YAML 解析 | js-yaml |
| 样式隔离 | Shadow DOM |

## 不在 V1 范围内

- 属性编辑（右栏只读）
- 组件或页面的拖拽排序
- 无限画布 / 缩放
- 导出功能
- 发布到 npm
- `<script>` 支持
