# Dekit AI Native 改造设计

将 dekit 从"人用的设计预览工具"转型为"Agent 的设计画布"。Agent 是主要的设计创作者，人类通过终端 + ref 协议参与决策。

## 定位

dekit = Agent 的设计画布。Agent 直接写 HTML/CSS，用 dekit 渲染预览和截图，形成"写代码 → 截图 → 分析 → 修改"的自主迭代循环。人类可随时通过 copy ref 介入指导。

## 方案选择

**方案 C — Agent Toolkit**：在现有架构上增量添加 CLI 命令、截图能力、模板系统和 Agent 文档。不改核心架构，低风险。

---

## 1. 配置文件重命名

`design.yaml` / `design.yml` → `dekit.yaml` / `dekit.yml`

影响范围：
- `parser.ts` 中的自动发现逻辑
- `-c` 参数默认值
- 所有文档和示例

## 2. Ref 协议重新设计

### 格式

```
$${page-key}              — 页面级
$${page-key@css-selector} — 元素级
```

- `$${ }` 提供明确边界，可安全嵌入任意文本
- `@` 分隔 page key 和 CSS Selector，不与 CSS `#` 冲突
- `page-key` 来自 `dekit.yaml` 中 pages 的 key

### 示例

```
$${home}                          — 首页
$${home@.hero}                    — 首页的 .hero 元素
$${home@#main-nav}                — 首页的 #main-nav
$${about@section:nth-child(2)}    — about 页第二个 section
$${dashboard@.sidebar > .menu}    — 复合选择器
```

### 设计原则

Agent 不需要理解 ref 协议内部结构。看到 `$${...}` 模式，传给 dekit CLI 即可：
- `dekit resolve <ref>` → 返回文件路径 + 行号
- `dekit screenshot <ref>` → 返回截图文件路径

## 3. CLI 命令体系

### 3.1 dekit init

```
dekit init [path] [--template landing|dashboard|mobile|blank]
```

两种使用场景：

**空项目：**
```bash
mkdir my-design && cd my-design
dekit init
```
在当前目录生成：dekit.yaml、global.css、pages/、components/

**已有项目：**
```bash
cd my-existing-project
dekit init design/
```
在指定子目录生成设计项目结构。

### 3.2 dekit add

```
dekit add page <name> [--template hero|form|grid|blank]
dekit add component <name>
```

在 pages/ 或 components/ 下创建对应目录和 HTML/CSS 文件，并自动更新 dekit.yaml。

### 3.3 dekit ls

```
dekit ls
```

列出当前项目的所有页面和组件。

### 3.4 dekit serve

```
dekit serve [-p 3000] [--no-open]
```

启动交互式预览（现有能力）。裸 `dekit` 命令等同于 `dekit serve`，向后兼容。

### 3.5 dekit screenshot

```
dekit screenshot <ref> [-o output.png] [--device iphone-14] [--full-page]
dekit screenshot --all [-o ./screenshots/]
```

参数为 ref 协议格式：
- `dekit screenshot '$${home}'` → 整页截图
- `dekit screenshot '$${home@.hero}'` → 元素截图
- `dekit screenshot --all` → 所有页面截图

内部流程：
1. 启动临时 Vite 服务器（随机端口）；如果 `dekit serve` 已在运行则复用
2. puppeteer-core 连接系统 Chrome，无头加载页面
3. 截图（整页或定位元素后截图）
4. 保存文件，输出路径
5. 关闭临时服务器和浏览器

截图模式不注入 inspector，输出纯净的设计渲染。

默认输出位置：`./screenshots/{page}.png`

### 3.6 dekit resolve

```
dekit resolve <ref>
```

解析 ref，返回源码位置：
- `dekit resolve '$${home}'` → `pages/home/home.html`
- `dekit resolve '$${home@.hero}'` → `pages/home/home.html:12-28`

### 3.7 dekit usage

```
dekit usage
```

输出打包在 npm 包里的完整 Agent 使用指南（markdown 格式）。这是 Agent 了解 dekit 用法的唯一 source of truth。

## 4. 截图能力

### 依赖

- **puppeteer-core** 作为直接依赖（~2MB npm 包）
- 复用系统已安装的 Chrome/Chromium，不下载额外浏览器
- 自动检测 Chrome 路径（macOS / Linux / Windows）
- 找不到时给出清晰错误：`Error: Chrome not found. Install Chrome or set CHROME_PATH environment variable.`

### 设备支持

复用现有 `devices.ts` 中的设备预设（iPhone、iPad、Android 等），通过 `--device` 参数指定。也支持 `--width` / `--height` 自定义尺寸。

## 5. 模板系统

### 两层模板

**项目模板**（`dekit init --template` 使用）：
- `blank` — 空项目骨架
- `landing` — 落地页（hero + features + pricing + footer）
- `dashboard` — 后台仪表盘（sidebar + header + content）
- `mobile` — 移动端应用（tab bar + header + content）

**页面模板**（`dekit add page --template` 使用）：
- `blank` — 最小 HTML + CSS
- `hero` — Hero 区块
- `form` — 表单布局
- `grid` — 卡片网格

### 存储

模板随 npm 包发布，位于包内 `templates/` 目录：

```
templates/
├── projects/
│   ├── blank/
│   ├── landing/
│   ├── dashboard/
│   └── mobile/
├── pages/
│   ├── blank/
│   ├── hero/
│   ├── form/
│   └── grid/
└── components/
    └── blank/
```

### 设计原则

- **模板要薄**：只提供结构骨架和基础样式，Agent 负责定制
- **纯 HTML/CSS**：无模板语法或变量替换，Agent 直接编辑
- **可列举**：`dekit init --template` 不带值时列出所有可用模板

## 6. Agent 接入方案

三层分离架构：

### 6.1 README "For Agents" 章节

在项目 README 中新增章节，告诉 Agent 如何安装 dekit 和配置 skill。仅作为发现入口。

### 6.2 Skill（薄壳）

内容极简，适配任何 Agent 平台：

```markdown
---
name: dekit
description: Use dekit to create, preview, and iterate on HTML/CSS designs
---
Run `dekit usage` to get the full usage guide.
Follow the guide to complete your design task.
```

dekit 不提供自动安装 skill 的能力。用户按 README 指引手动配置。

### 6.3 dekit usage 命令

输出打包在 npm 包内的完整使用指南（`docs/usage.md`），包含：
- 核心概念（页面、组件、ref 协议）
- CLI 参考（每个命令的用法和示例输出）
- 设计循环工作流
- dekit.yaml 配置格式

这是唯一的 source of truth，随包版本更新。

## 7. Agent 工作流

### 自主设计循环

```
dekit init [--template landing]    → 初始化项目
Agent 编辑 HTML/CSS                → 创作设计
dekit screenshot '$${home}'        → 截图查看
Agent 分析截图                     → 发现问题
Agent 修改代码                     → 迭代改进
dekit screenshot '$${home}'        → 再次确认
```

### 人机协作循环

```
dekit serve                        → 人类在浏览器中审阅
人类右键 Copy Ref                   → 得到 $${home@.hero}
人类在终端粘贴 ref + 描述           → "把 $${home@.hero} 的间距调小"
Agent: dekit resolve '$${home@.hero}'  → 定位到 home.html:12-28
Agent 修改代码                     → 执行修改
Agent: dekit screenshot '$${home@.hero}' → 截图验证
```

## 8. 不做的事情

- 不做设计稿到框架代码的转化（纯设计参考）
- 不做 MCP Server（CLI 命令集成）
- 不做 headless-first 架构重构
- 不做 skill 自动安装
- 不做自定义模板加载（从 URL/本地路径）
- 不做组件片段库（先用模板系统覆盖）
