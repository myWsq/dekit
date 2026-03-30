# Redesign CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI tool (`redesign`) that parses a `design.yaml`, launches a Vite-powered design server for Web Component pages, and serves a React-based three-panel editor UI for inspecting them.

**Architecture:** Dual-server — an Editor Server (static files, pre-built React app) on port 3000, and a Design Server (Vite dev server with custom plugin) on port 3001. The editor renders design pages in an iframe and communicates via postMessage.

**Tech Stack:** TypeScript, Vite (createServer API + custom plugin), React, js-yaml, sirv (static serving)

---

## File Structure

```
cli/
├── package.json                          # CLI package, bin entry, dependencies
├── tsconfig.json                         # TypeScript config
├── bin/
│   └── redesign.ts                       # CLI entry: arg parsing, orchestration
├── src/
│   ├── types.ts                          # Shared types (DesignConfig, PageDef, ComponentDef)
│   ├── parser.ts                         # design.yaml parsing + validation
│   ├── server.ts                         # Starts both servers, opens browser
│   ├── editor-server.ts                  # Static file server for editor UI + /api/config
│   ├── design-server.ts                  # Vite dev server wrapper
│   ├── vite-plugin-redesign.ts           # Vite plugin: route interception, HTML assembly
│   └── injected/
│       ├── register-components.ts        # Template: Web Component registration script
│       └── inspector.ts                  # Template: click/hover/DOM-tree communication script
├── editor/                               # React editor UI (dev-time Vite, builds to dist/)
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx                      # React entry
│       ├── App.tsx                       # Three-panel layout shell
│       ├── types.ts                      # Editor-side types (NodeInfo, DOMTreeNode, messages)
│       ├── components/
│       │   ├── PageTree.tsx              # Left panel top: page list
│       │   ├── LayerTree.tsx             # Left panel bottom: DOM tree
│       │   ├── Canvas.tsx                # Center: iframe wrapper
│       │   └── PropertyPanel.tsx         # Right panel: selected node properties
│       ├── hooks/
│       │   ├── useConfig.ts             # Fetch /api/config
│       │   └── useIframeComm.ts         # postMessage communication with iframe
│       └── styles/
│           └── editor.css                # Editor layout styles
└── dist/
    └── editor/                           # Build output (gitignored)
```

Also update the example design directory (fix typo `deisgn` → `design`):
```
design/
├── design.yaml                           # Updated to map format, hyphenated keys
├── global.css
├── components/
│   └── my-banner/
│       ├── banner.html
│       └── banner.css
└── pages/
    ├── cover/
    │   ├── cover.html
    │   └── cover.css
    └── example/
        ├── example.html
        └── example.css
```

---

### Task 1: Project Scaffolding & Example Design

Set up the CLI package, install dependencies, and create the example design directory with working sample content.

**Files:**
- Create: `cli/package.json`
- Create: `cli/tsconfig.json`
- Rename: `deisgn/` → `design/`
- Modify: `design/design.yaml`
- Modify: `design/global.css`
- Rename: `design/components/banner/` → `design/components/my-banner/`
- Modify: `design/components/my-banner/banner.html`
- Modify: `design/components/my-banner/banner.css`
- Modify: `design/pages/cover/cover.html`
- Modify: `design/pages/cover/cover.css`
- Modify: `design/pages/example/example.html`
- Modify: `design/pages/example/example.css`

- [ ] **Step 1: Rename the misspelled design directory**

```bash
mv /Users/bytedance/t/redesign/deisgn /Users/bytedance/t/redesign/design
mv /Users/bytedance/t/redesign/design/components/banner /Users/bytedance/t/redesign/design/components/my-banner
```

- [ ] **Step 2: Create cli/package.json**

```json
{
  "name": "redesign-cli",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "redesign": "./bin/redesign.ts"
  },
  "scripts": {
    "dev": "tsx bin/redesign.ts",
    "build:editor": "vite build --config editor/vite.config.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "js-yaml": "^4.1.0",
    "open": "^10.1.0",
    "sirv": "^3.0.0",
    "vite": "^6.2.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "@vitejs/plugin-react": "^4.3.0"
  }
}
```

- [ ] **Step 3: Create cli/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": ".",
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "bin/**/*", "editor/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Update design.yaml to use map format with hyphenated keys**

```yaml
version: 1.0
global-style: "global.css"

components:
  my-banner:
    template: "components/my-banner/banner.html"
    style: "components/my-banner/banner.css"

pages:
  cover:
    template: "pages/cover/cover.html"
    style: "pages/cover/cover.css"
  example:
    template: "pages/example/example.html"
    style: "pages/example/example.css"
```

- [ ] **Step 5: Write example design content**

`design/global.css`:
```css
:root {
  --color-primary: #2563eb;
  --color-text: #1f2937;
  --color-bg: #ffffff;
  --font-sans: system-ui, -apple-system, sans-serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--color-bg);
}
```

`design/components/my-banner/banner.html`:
```html
<template>
  <div class="banner">
    <slot></slot>
  </div>
</template>
```

`design/components/my-banner/banner.css`:
```css
.banner {
  padding: 24px 32px;
  background: var(--color-primary, #2563eb);
  color: #ffffff;
  font-size: 24px;
  font-weight: 600;
  border-radius: 8px;
}
```

`design/pages/cover/cover.html`:
```html
<div class="cover-page">
  <my-banner>Welcome to Redesign</my-banner>
  <p class="subtitle">A design tool powered by Web Components</p>
</div>
```

`design/pages/cover/cover.css`:
```css
.cover-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 24px;
  padding: 48px;
}

.subtitle {
  font-size: 18px;
  color: #6b7280;
}
```

`design/pages/example/example.html`:
```html
<div class="example-page">
  <h1>Example Page</h1>
  <my-banner>This is a banner component</my-banner>
  <div class="card">
    <h2>Card Title</h2>
    <p>Some content in a card.</p>
  </div>
</div>
```

`design/pages/example/example.css`:
```css
.example-page {
  padding: 48px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.card {
  padding: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.card h2 {
  margin-bottom: 8px;
  font-size: 20px;
}
```

- [ ] **Step 6: Install dependencies**

```bash
cd /Users/bytedance/t/redesign/cli && bun install
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold CLI package and example design directory"
```

---

### Task 2: Types & YAML Parser

Define shared types and implement the design.yaml parser with validation.

**Files:**
- Create: `cli/src/types.ts`
- Create: `cli/src/parser.ts`
- Create: `cli/src/parser.test.ts`

- [ ] **Step 1: Write the failing test for parser**

Create `cli/src/parser.test.ts`:

```ts
import { describe, test, expect } from "vitest";
import { parseDesignConfig } from "./parser.js";
import { join } from "node:path";

const DESIGN_DIR = join(import.meta.dirname, "../../design");

describe("parseDesignConfig", () => {
  test("parses valid design.yaml", async () => {
    const config = await parseDesignConfig(join(DESIGN_DIR, "design.yaml"));
    expect(config.version).toBe(1.0);
    expect(config.globalStyle).toBe("global.css");
    expect(config.components["my-banner"]).toEqual({
      template: "components/my-banner/banner.html",
      style: "components/my-banner/banner.css",
    });
    expect(config.pages["cover"]).toEqual({
      template: "pages/cover/cover.html",
      style: "pages/cover/cover.css",
    });
    expect(config.pages["example"]).toBeDefined();
  });

  test("stores resolved base directory", async () => {
    const config = await parseDesignConfig(join(DESIGN_DIR, "design.yaml"));
    expect(config.baseDir).toBe(DESIGN_DIR);
  });

  test("rejects component key without hyphen", async () => {
    const yaml = `
version: 1.0
global-style: "global.css"
components:
  banner:
    template: "components/banner/banner.html"
    style: "components/banner/banner.css"
pages: {}
`;
    await expect(
      parseDesignConfig("/fake/design.yaml", yaml)
    ).rejects.toThrow(/hyphen/i);
  });

  test("rejects missing template file", async () => {
    const yaml = `
version: 1.0
global-style: "global.css"
components: {}
pages:
  cover:
    template: "pages/nonexistent.html"
    style: "pages/cover/cover.css"
`;
    await expect(
      parseDesignConfig(join(DESIGN_DIR, "design.yaml"), yaml)
    ).rejects.toThrow(/not found|does not exist/i);
  });

  test("rejects missing version field", async () => {
    const yaml = `
global-style: "global.css"
components: {}
pages: {}
`;
    await expect(
      parseDesignConfig("/fake/design.yaml", yaml)
    ).rejects.toThrow(/version/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/bytedance/t/redesign/cli && npx vitest run src/parser.test.ts
```

Expected: FAIL — `parseDesignConfig` does not exist.

- [ ] **Step 3: Create cli/src/types.ts**

```ts
export interface ComponentDef {
  template: string;
  style: string;
}

export interface PageDef {
  template: string;
  style: string;
}

export interface DesignConfig {
  version: number;
  globalStyle: string;
  components: Record<string, ComponentDef>;
  pages: Record<string, PageDef>;
  baseDir: string; // absolute path to directory containing design.yaml
}
```

- [ ] **Step 4: Implement cli/src/parser.ts**

```ts
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import yaml from "js-yaml";
import type { DesignConfig, ComponentDef, PageDef } from "./types.js";

export async function parseDesignConfig(
  configPath: string,
  rawContent?: string
): Promise<DesignConfig> {
  const absolutePath = resolve(configPath);
  const baseDir = dirname(absolutePath);
  const content = rawContent ?? (await readFile(absolutePath, "utf-8"));
  const doc = yaml.load(content) as Record<string, unknown>;

  if (!doc || typeof doc !== "object") {
    throw new Error("Invalid design.yaml: not a valid YAML object");
  }

  if (doc.version == null) {
    throw new Error("Invalid design.yaml: missing 'version' field");
  }

  const globalStyle = (doc["global-style"] as string) ?? "";
  if (globalStyle && !rawContent) {
    const globalStylePath = join(baseDir, globalStyle);
    if (!existsSync(globalStylePath)) {
      throw new Error(
        `Global style file not found: ${globalStylePath}`
      );
    }
  }

  const rawComponents = (doc.components as Record<string, { template: string; style: string }>) ?? {};
  const components: Record<string, ComponentDef> = {};
  for (const [key, val] of Object.entries(rawComponents)) {
    if (!key.includes("-")) {
      throw new Error(
        `Component key "${key}" must contain a hyphen (Web Component spec requires it)`
      );
    }
    if (!rawContent) {
      validateFilePaths(baseDir, key, val.template, val.style);
    }
    components[key] = { template: val.template, style: val.style };
  }

  const rawPages = (doc.pages as Record<string, { template: string; style: string }>) ?? {};
  const pages: Record<string, PageDef> = {};
  for (const [key, val] of Object.entries(rawPages)) {
    if (!rawContent) {
      validateFilePaths(baseDir, key, val.template, val.style);
    }
    pages[key] = { template: val.template, style: val.style };
  }

  return {
    version: doc.version as number,
    globalStyle,
    components,
    pages,
    baseDir,
  };
}

function validateFilePaths(
  baseDir: string,
  key: string,
  template: string,
  style: string
): void {
  const templatePath = join(baseDir, template);
  if (!existsSync(templatePath)) {
    throw new Error(
      `Template file not found for "${key}": ${templatePath}`
    );
  }
  const stylePath = join(baseDir, style);
  if (!existsSync(stylePath)) {
    throw new Error(
      `Style file not found for "${key}": ${stylePath}`
    );
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/bytedance/t/redesign/cli && npx vitest run src/parser.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/bytedance/t/redesign/cli
git add src/types.ts src/parser.ts src/parser.test.ts
git commit -m "feat: add design.yaml parser with validation"
```

---

### Task 3: Vite Plugin — Route Interception & HTML Assembly

Build the Vite plugin that intercepts `/page/:name` routes and returns assembled HTML with Web Component registration and inspector scripts.

**Files:**
- Create: `cli/src/vite-plugin-redesign.ts`
- Create: `cli/src/injected/register-components.ts`
- Create: `cli/src/injected/inspector.ts`
- Create: `cli/src/vite-plugin-redesign.test.ts`

- [ ] **Step 1: Write the failing test**

Create `cli/src/vite-plugin-redesign.test.ts`:

```ts
import { describe, test, expect } from "vitest";
import { assemblePageHtml } from "./vite-plugin-redesign.js";
import type { DesignConfig } from "./types.js";
import { join } from "node:path";

const DESIGN_DIR = join(import.meta.dirname, "../../design");

const mockConfig: DesignConfig = {
  version: 1.0,
  globalStyle: "global.css",
  components: {
    "my-banner": {
      template: "components/my-banner/banner.html",
      style: "components/my-banner/banner.css",
    },
  },
  pages: {
    cover: {
      template: "pages/cover/cover.html",
      style: "pages/cover/cover.css",
    },
  },
  baseDir: DESIGN_DIR,
};

describe("assemblePageHtml", () => {
  test("generates valid HTML for a page", async () => {
    const html = await assemblePageHtml(mockConfig, "cover");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("global.css");
    expect(html).toContain("pages/cover/cover.css");
    expect(html).toContain("Welcome to Redesign");
    expect(html).toContain("customElements.define");
    expect(html).toContain("my-banner");
  });

  test("throws for unknown page", async () => {
    await expect(
      assemblePageHtml(mockConfig, "nonexistent")
    ).rejects.toThrow(/not found/i);
  });

  test("includes inspector script", async () => {
    const html = await assemblePageHtml(mockConfig, "cover");
    expect(html).toContain("postMessage");
    expect(html).toContain("NODE_SELECTED");
  });

  test("extracts template inner content for component registration", async () => {
    const html = await assemblePageHtml(mockConfig, "cover");
    // Should contain the component class registration with the banner's inner HTML
    expect(html).toContain("class=\"banner\"");
    expect(html).toContain("<slot></slot>");
    // Should NOT contain the outer <template> tags in registration
    expect(html).not.toMatch(/innerHTML\s*=\s*`\s*<template>/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/bytedance/t/redesign/cli && npx vitest run src/vite-plugin-redesign.test.ts
```

Expected: FAIL — `assemblePageHtml` does not exist.

- [ ] **Step 3: Create cli/src/injected/register-components.ts**

This file is a template generator, not injected code itself.

```ts
import type { ComponentDef } from "../types.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

function tagNameToClassName(tagName: string): string {
  return tagName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function extractTemplateContent(html: string): string {
  const match = html.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
  return match ? match[1].trim() : html.trim();
}

export async function generateComponentRegistrationScript(
  components: Record<string, ComponentDef>,
  baseDir: string
): Promise<string> {
  const registrations: string[] = [];

  for (const [tagName, def] of Object.entries(components)) {
    const templateHtml = await readFile(join(baseDir, def.template), "utf-8");
    const styleContent = await readFile(join(baseDir, def.style), "utf-8");
    const innerContent = extractTemplateContent(templateHtml);
    const className = tagNameToClassName(tagName);

    registrations.push(`
class ${className} extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = ${JSON.stringify(styleContent)};
    shadow.appendChild(style);
    const tpl = document.createElement('template');
    tpl.innerHTML = ${JSON.stringify(innerContent)};
    shadow.appendChild(tpl.content.cloneNode(true));
  }
}
customElements.define(${JSON.stringify(tagName)}, ${className});
`);
  }

  return registrations.join("\n");
}
```

- [ ] **Step 4: Create cli/src/injected/inspector.ts**

This generates the inspector script that runs inside the iframe.

```ts
export function generateInspectorScript(): string {
  return `
(function() {
  let highlightOverlay = null;

  function createOverlay() {
    const el = document.createElement('div');
    el.id = '__redesign_overlay__';
    el.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #2563eb;background:rgba(37,99,235,0.08);z-index:999999;display:none;transition:all 0.1s ease;';
    document.body.appendChild(el);
    return el;
  }

  function getNodePath(node) {
    const parts = [];
    let current = node;
    while (current && current !== document.body) {
      const parent = current.parentNode;
      if (!parent) break;
      const children = Array.from(parent.children);
      const index = children.indexOf(current);
      parts.unshift(current.tagName.toLowerCase() + '[' + index + ']');
      current = parent;
    }
    parts.unshift('body');
    return parts.join('/');
  }

  function getNodeInfo(node) {
    const computed = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    const attrs = {};
    for (const attr of node.attributes) {
      attrs[attr.name] = attr.value;
    }
    const styles = {};
    const styleProps = [
      'width','height','padding','margin','display','position',
      'background','backgroundColor','color','border','borderRadius','opacity',
      'fontFamily','fontSize','fontWeight','lineHeight',
      'paddingTop','paddingRight','paddingBottom','paddingLeft',
      'marginTop','marginRight','marginBottom','marginLeft',
      'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth'
    ];
    for (const prop of styleProps) {
      styles[prop] = computed[prop];
    }
    return {
      tagName: node.tagName.toLowerCase(),
      path: getNodePath(node),
      attributes: attrs,
      computedStyles: styles,
      boundingRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    };
  }

  function showOverlay(rect) {
    if (!highlightOverlay) highlightOverlay = createOverlay();
    highlightOverlay.style.display = 'block';
    highlightOverlay.style.left = rect.x + 'px';
    highlightOverlay.style.top = rect.y + 'px';
    highlightOverlay.style.width = rect.width + 'px';
    highlightOverlay.style.height = rect.height + 'px';
  }

  function hideOverlay() {
    if (highlightOverlay) highlightOverlay.style.display = 'none';
  }

  function buildDomTree(node) {
    if (node.nodeType !== 1) return null;
    const tagName = node.tagName.toLowerCase();
    if (tagName === 'script' || tagName === 'style' || node.id === '__redesign_overlay__') return null;
    const children = [];
    for (const child of node.children) {
      const subtree = buildDomTree(child);
      if (subtree) children.push(subtree);
    }
    const classAttr = node.getAttribute('class');
    return {
      tagName,
      path: getNodePath(node),
      className: classAttr || '',
      children
    };
  }

  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const node = e.target;
    if (node.id === '__redesign_overlay__') return;
    const info = getNodeInfo(node);
    showOverlay(info.boundingRect);
    window.parent.postMessage({ type: 'NODE_SELECTED', node: info }, '*');
  }, true);

  document.addEventListener('mouseover', function(e) {
    const node = e.target;
    if (node.id === '__redesign_overlay__') return;
    const rect = node.getBoundingClientRect();
    showOverlay(rect);
    const info = getNodeInfo(node);
    window.parent.postMessage({ type: 'NODE_HOVERED', node: info }, '*');
  }, true);

  window.addEventListener('message', function(e) {
    const msg = e.data;
    if (!msg || !msg.type) return;
    if (msg.type === 'GET_DOM_TREE') {
      const tree = buildDomTree(document.body);
      window.parent.postMessage({ type: 'DOM_TREE', tree: tree ? [tree] : [] }, '*');
    } else if (msg.type === 'HIGHLIGHT_NODE') {
      const parts = msg.path.split('/').slice(1); // skip 'body'
      let current = document.body;
      for (const part of parts) {
        const match = part.match(/^(.+)\\[(\\d+)\\]$/);
        if (!match) break;
        const children = Array.from(current.children);
        current = children[parseInt(match[2])];
        if (!current) break;
      }
      if (current && current !== document.body) {
        const rect = current.getBoundingClientRect();
        showOverlay(rect);
        const info = getNodeInfo(current);
        window.parent.postMessage({ type: 'NODE_SELECTED', node: info }, '*');
      }
    } else if (msg.type === 'CLEAR_HIGHLIGHT') {
      hideOverlay();
    }
  });
})();
`;
}
```

- [ ] **Step 5: Implement cli/src/vite-plugin-redesign.ts**

```ts
import type { Plugin } from "vite";
import type { DesignConfig } from "./types.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { generateComponentRegistrationScript } from "./injected/register-components.js";
import { generateInspectorScript } from "./injected/inspector.js";

export async function assemblePageHtml(
  config: DesignConfig,
  pageName: string
): Promise<string> {
  const pageDef = config.pages[pageName];
  if (!pageDef) {
    throw new Error(`Page "${pageName}" not found in design config`);
  }

  const pageTemplate = await readFile(
    join(config.baseDir, pageDef.template),
    "utf-8"
  );
  const componentScript = await generateComponentRegistrationScript(
    config.components,
    config.baseDir
  );
  const inspectorScript = generateInspectorScript();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="/@design/${config.globalStyle}">
  <link rel="stylesheet" href="/@design/${pageDef.style}">
</head>
<body>
${pageTemplate}
<script type="module">
${componentScript}
</script>
<script>
${inspectorScript}
</script>
</body>
</html>`;
}

export function redesignPlugin(configRef: { current: DesignConfig }): Plugin {
  return {
    name: "vite-plugin-redesign",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";

        // Serve design static files (CSS, etc.)
        if (url.startsWith("/@design/")) {
          const filePath = join(
            configRef.current.baseDir,
            url.replace("/@design/", "")
          );
          try {
            const content = await readFile(filePath, "utf-8");
            const ext = filePath.split(".").pop();
            const mimeTypes: Record<string, string> = {
              css: "text/css",
              html: "text/html",
              js: "application/javascript",
            };
            res.setHeader(
              "Content-Type",
              mimeTypes[ext ?? ""] ?? "text/plain"
            );
            res.end(content);
          } catch {
            res.statusCode = 404;
            res.end("Not found");
          }
          return;
        }

        // Serve assembled page HTML
        const pageMatch = url.match(/^\/page\/([^/?#]+)/);
        if (pageMatch) {
          const pageName = pageMatch[1];
          try {
            const html = await assemblePageHtml(configRef.current, pageName);
            res.setHeader("Content-Type", "text/html");
            res.end(html);
          } catch (err) {
            res.statusCode = 404;
            res.end(
              err instanceof Error ? err.message : "Page not found"
            );
          }
          return;
        }

        next();
      });

      // Watch design directory for changes → trigger full reload
      const watcher = server.watcher;
      watcher.add(configRef.current.baseDir);
      watcher.on("change", (changedPath) => {
        if (changedPath.startsWith(configRef.current.baseDir)) {
          server.ws.send({ type: "full-reload" });
        }
      });
    },
  };
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /Users/bytedance/t/redesign/cli && npx vitest run src/vite-plugin-redesign.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
cd /Users/bytedance/t/redesign/cli
git add src/vite-plugin-redesign.ts src/vite-plugin-redesign.test.ts src/injected/
git commit -m "feat: vite plugin with page HTML assembly and inspector injection"
```

---

### Task 4: Design Server & Editor Server

Wire up the two servers: Vite dev server (design) and static file server (editor + /api/config).

**Files:**
- Create: `cli/src/design-server.ts`
- Create: `cli/src/editor-server.ts`
- Create: `cli/src/server.ts`

- [ ] **Step 1: Implement cli/src/design-server.ts**

```ts
import { createServer, type ViteDevServer } from "vite";
import type { DesignConfig } from "./types.js";
import { redesignPlugin } from "./vite-plugin-redesign.js";

export async function startDesignServer(
  configRef: { current: DesignConfig },
  port: number
): Promise<ViteDevServer> {
  const server = await createServer({
    configFile: false,
    root: configRef.current.baseDir,
    server: {
      port,
      strictPort: true,
      cors: true,
    },
    plugins: [redesignPlugin(configRef)],
    logLevel: "silent",
  });

  await server.listen();
  console.log(`  Design server running at http://localhost:${port}`);
  return server;
}
```

- [ ] **Step 2: Implement cli/src/editor-server.ts**

```ts
import { createServer } from "node:http";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import type { DesignConfig } from "./types.js";

export async function startEditorServer(
  configRef: { current: DesignConfig },
  port: number,
  designPort: number
): Promise<ReturnType<typeof createServer>> {
  const editorDistDir = join(import.meta.dirname, "../dist/editor");

  const server = createServer(async (req, res) => {
    const url = req.url ?? "/";

    // API: return design config as JSON
    if (url === "/api/config") {
      const config = configRef.current;
      const payload = {
        pages: Object.keys(config.pages),
        components: Object.keys(config.components),
        designServerUrl: `http://localhost:${designPort}`,
      };
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify(payload));
      return;
    }

    // Serve static editor files
    let filePath = join(editorDistDir, url === "/" ? "index.html" : url);
    try {
      const content = await readFile(filePath);
      const ext = filePath.split(".").pop() ?? "";
      const mimeTypes: Record<string, string> = {
        html: "text/html",
        js: "application/javascript",
        css: "text/css",
        svg: "image/svg+xml",
        png: "image/png",
        json: "application/json",
      };
      res.setHeader("Content-Type", mimeTypes[ext] ?? "application/octet-stream");
      res.end(content);
    } catch {
      // SPA fallback
      try {
        const index = await readFile(join(editorDistDir, "index.html"));
        res.setHeader("Content-Type", "text/html");
        res.end(index);
      } catch {
        res.statusCode = 404;
        res.end("Not found");
      }
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`  Editor server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}
```

- [ ] **Step 3: Implement cli/src/server.ts**

```ts
import type { DesignConfig } from "./types.js";
import { startDesignServer } from "./design-server.js";
import { startEditorServer } from "./editor-server.js";

export interface ServerOptions {
  config: DesignConfig;
  port: number;
  designPort: number;
}

export async function startServers(options: ServerOptions) {
  const configRef = { current: options.config };

  console.log("\n  Redesign Dev Server\n");

  const designServer = await startDesignServer(configRef, options.designPort);
  const editorServer = await startEditorServer(
    configRef,
    options.port,
    options.designPort
  );

  const editorUrl = `http://localhost:${options.port}`;
  console.log(`\n  Open ${editorUrl} in your browser\n`);

  // Try to open browser
  try {
    const open = await import("open");
    await open.default(editorUrl);
  } catch {
    // Silently ignore if open fails
  }

  return { designServer, editorServer };
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/bytedance/t/redesign/cli
git add src/design-server.ts src/editor-server.ts src/server.ts
git commit -m "feat: dual server setup — design (Vite) and editor (static)"
```

---

### Task 5: CLI Entry Point

Create the CLI binary that parses arguments and orchestrates startup.

**Files:**
- Create: `cli/bin/redesign.ts`

- [ ] **Step 1: Implement cli/bin/redesign.ts**

```ts
#!/usr/bin/env tsx
import { resolve } from "node:path";
import { parseDesignConfig } from "../src/parser.js";
import { startServers } from "../src/server.js";

function printUsage() {
  console.log(`
Usage: redesign -c <design.yaml>

Options:
  -c, --config       Path to design.yaml (required)
  -p, --port         Editor server port (default: 3000)
  --design-port      Design server port (default: 3001)
  -h, --help         Show this help message
`);
}

function parseArgs(args: string[]) {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-c" || arg === "--config") {
      result.config = args[++i];
    } else if (arg === "-p" || arg === "--port") {
      result.port = args[++i];
    } else if (arg === "--design-port") {
      result.designPort = args[++i];
    } else if (arg === "-h" || arg === "--help") {
      result.help = "true";
    }
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  if (!args.config) {
    console.error("Error: -c <design.yaml> is required\n");
    printUsage();
    process.exit(1);
  }

  const configPath = resolve(args.config);
  let config;
  try {
    config = await parseDesignConfig(configPath);
  } catch (err) {
    console.error(
      `Error parsing config: ${err instanceof Error ? err.message : err}`
    );
    process.exit(1);
  }

  const port = parseInt(args.port ?? "3000", 10);
  const designPort = parseInt(args.designPort ?? "3001", 10);

  await startServers({ config, port, designPort });
}

main();
```

- [ ] **Step 2: Test CLI launches without errors (no editor build yet, so it will serve design pages only)**

```bash
cd /Users/bytedance/t/redesign/cli && npx tsx bin/redesign.ts -c ../design/design.yaml
```

Expected: servers start on ports 3000 and 3001. Design server at `http://localhost:3001/page/cover` should return assembled HTML. Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
cd /Users/bytedance/t/redesign/cli
git add bin/redesign.ts
git commit -m "feat: CLI entry point with arg parsing"
```

---

### Task 6: Editor UI — Project Setup & Shell Layout

Scaffold the React editor app with three-panel layout.

**Files:**
- Create: `cli/editor/index.html`
- Create: `cli/editor/vite.config.ts`
- Create: `cli/editor/src/main.tsx`
- Create: `cli/editor/src/App.tsx`
- Create: `cli/editor/src/types.ts`
- Create: `cli/editor/src/styles/editor.css`

- [ ] **Step 1: Create cli/editor/vite.config.ts**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  build: {
    outDir: "../dist/editor",
    emptyDirBefore: true,
  },
});
```

- [ ] **Step 2: Create cli/editor/src/types.ts**

```ts
export interface NodeInfo {
  tagName: string;
  path: string;
  attributes: Record<string, string>;
  computedStyles: Record<string, string>;
  boundingRect: { x: number; y: number; width: number; height: number };
}

export interface DOMTreeNode {
  tagName: string;
  path: string;
  className: string;
  children: DOMTreeNode[];
}

export interface EditorConfig {
  pages: string[];
  components: string[];
  designServerUrl: string;
}

// Messages from iframe → editor
export type IframeMessage =
  | { type: "NODE_SELECTED"; node: NodeInfo }
  | { type: "NODE_HOVERED"; node: NodeInfo }
  | { type: "DOM_TREE"; tree: DOMTreeNode[] };

// Messages from editor → iframe
export type EditorMessage =
  | { type: "GET_DOM_TREE" }
  | { type: "HIGHLIGHT_NODE"; path: string }
  | { type: "CLEAR_HIGHLIGHT" };
```

- [ ] **Step 3: Create cli/editor/src/styles/editor.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
  height: 100vh;
  background: #1e1e1e;
  color: #cccccc;
}

#root {
  height: 100vh;
}

.editor-layout {
  display: flex;
  height: 100vh;
}

.left-panel {
  width: 240px;
  background: #252526;
  border-right: 1px solid #3c3c3c;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.center-panel {
  flex: 1;
  background: #1e1e1e;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.right-panel {
  width: 280px;
  background: #252526;
  border-left: 1px solid #3c3c3c;
  overflow-y: auto;
}

.panel-header {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #969696;
  border-bottom: 1px solid #3c3c3c;
  user-select: none;
}

.page-list {
  list-style: none;
}

.page-item {
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #cccccc;
  user-select: none;
}

.page-item:hover {
  background: #2a2d2e;
}

.page-item.active {
  background: #37373d;
  color: #ffffff;
}

.canvas-iframe {
  width: 100%;
  height: 100%;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  background: #ffffff;
}

.layer-tree {
  padding: 4px 0;
  font-size: 13px;
  overflow-y: auto;
  flex: 1;
}

.layer-node {
  padding: 3px 0;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  color: #cccccc;
}

.layer-node:hover {
  background: #2a2d2e;
}

.layer-node.selected {
  background: #37373d;
  color: #ffffff;
}

.layer-tag {
  color: #569cd6;
}

.layer-class {
  color: #9cdcfe;
  margin-left: 4px;
  font-size: 11px;
}

.property-section {
  padding: 8px 12px;
  border-bottom: 1px solid #3c3c3c;
}

.property-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #969696;
  margin-bottom: 6px;
}

.property-row {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
  font-size: 12px;
}

.property-key {
  color: #9cdcfe;
}

.property-value {
  color: #ce9178;
  text-align: right;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: #969696;
  font-size: 13px;
}
```

- [ ] **Step 4: Create cli/editor/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redesign Editor</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 5: Create cli/editor/src/main.tsx**

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles/editor.css";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
```

- [ ] **Step 6: Create cli/editor/src/App.tsx**

```tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import type { EditorConfig, NodeInfo, DOMTreeNode, IframeMessage } from "./types.js";

export function App() {
  const [config, setConfig] = useState<EditorConfig | null>(null);
  const [currentPage, setCurrentPage] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [domTree, setDomTree] = useState<DOMTreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch config
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: EditorConfig) => {
        setConfig(data);
        if (data.pages.length > 0) {
          setCurrentPage(data.pages[0]);
        }
      });
  }, []);

  // Listen for iframe messages
  useEffect(() => {
    function handleMessage(e: MessageEvent<IframeMessage>) {
      const msg = e.data;
      if (!msg || !msg.type) return;
      if (msg.type === "NODE_SELECTED") {
        setSelectedNode(msg.node);
        setSelectedPath(msg.node.path);
      } else if (msg.type === "DOM_TREE") {
        setDomTree(msg.tree);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Request DOM tree when page loads in iframe
  const handleIframeLoad = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "GET_DOM_TREE" }, "*");
  }, []);

  // Click on layer tree node
  const handleLayerClick = useCallback((path: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "HIGHLIGHT_NODE", path },
      "*"
    );
    setSelectedPath(path);
  }, []);

  if (!config) {
    return <div className="empty-state">Loading...</div>;
  }

  const iframeSrc = currentPage
    ? `${config.designServerUrl}/page/${currentPage}`
    : "";

  return (
    <div className="editor-layout">
      {/* Left Panel */}
      <div className="left-panel">
        <div className="panel-header">Pages</div>
        <ul className="page-list">
          {config.pages.map((page) => (
            <li
              key={page}
              className={`page-item ${page === currentPage ? "active" : ""}`}
              onClick={() => {
                setCurrentPage(page);
                setSelectedNode(null);
                setDomTree([]);
                setSelectedPath("");
              }}
            >
              {page}
            </li>
          ))}
        </ul>
        <div className="panel-header">Layers</div>
        <div className="layer-tree">
          {domTree.map((node) => (
            <LayerTreeNode
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              onSelect={handleLayerClick}
            />
          ))}
        </div>
      </div>

      {/* Center Panel */}
      <div className="center-panel">
        {iframeSrc ? (
          <iframe
            ref={iframeRef}
            className="canvas-iframe"
            src={iframeSrc}
            onLoad={handleIframeLoad}
          />
        ) : (
          <div className="empty-state">Select a page</div>
        )}
      </div>

      {/* Right Panel */}
      <div className="right-panel">
        <div className="panel-header">Properties</div>
        {selectedNode ? (
          <PropertyPanel node={selectedNode} />
        ) : (
          <div className="empty-state">Select an element to inspect</div>
        )}
      </div>
    </div>
  );
}

function LayerTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: DOMTreeNode;
  depth: number;
  selectedPath: string;
  onSelect: (path: string) => void;
}) {
  return (
    <>
      <div
        className={`layer-node ${node.path === selectedPath ? "selected" : ""}`}
        style={{ paddingLeft: 12 + depth * 16 }}
        onClick={() => onSelect(node.path)}
      >
        <span className="layer-tag">&lt;{node.tagName}&gt;</span>
        {node.className && (
          <span className="layer-class">.{node.className.split(" ")[0]}</span>
        )}
      </div>
      {node.children.map((child) => (
        <LayerTreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function PropertyPanel({ node }: { node: NodeInfo }) {
  const layoutStyles = ["width", "height", "display", "position",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "marginTop", "marginRight", "marginBottom", "marginLeft"];
  const visualStyles = ["backgroundColor", "color", "border",
    "borderRadius", "opacity"];
  const textStyles = ["fontFamily", "fontSize", "fontWeight", "lineHeight"];

  function renderStyleGroup(title: string, keys: string[]) {
    const entries = keys
      .map((k) => [k, node.computedStyles[k]])
      .filter(([, v]) => v && v !== "none" && v !== "normal" && v !== "0px");
    if (entries.length === 0) return null;
    return (
      <div className="property-section">
        <div className="property-section-title">{title}</div>
        {entries.map(([k, v]) => (
          <div key={k} className="property-row">
            <span className="property-key">{k}</span>
            <span className="property-value">{v}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="property-section">
        <div className="property-section-title">Element</div>
        <div className="property-row">
          <span className="property-key">Tag</span>
          <span className="property-value">&lt;{node.tagName}&gt;</span>
        </div>
        {Object.entries(node.attributes).map(([k, v]) => (
          <div key={k} className="property-row">
            <span className="property-key">{k}</span>
            <span className="property-value">{v}</span>
          </div>
        ))}
      </div>
      <div className="property-section">
        <div className="property-section-title">Size</div>
        <div className="property-row">
          <span className="property-key">width</span>
          <span className="property-value">{Math.round(node.boundingRect.width)}px</span>
        </div>
        <div className="property-row">
          <span className="property-key">height</span>
          <span className="property-value">{Math.round(node.boundingRect.height)}px</span>
        </div>
      </div>
      {renderStyleGroup("Layout", layoutStyles)}
      {renderStyleGroup("Visual", visualStyles)}
      {renderStyleGroup("Typography", textStyles)}
    </>
  );
}
```

- [ ] **Step 7: Build the editor and verify**

```bash
cd /Users/bytedance/t/redesign/cli && npx vite build --config editor/vite.config.ts
```

Expected: build succeeds, output in `cli/dist/editor/`.

- [ ] **Step 8: Commit**

```bash
cd /Users/bytedance/t/redesign/cli
git add editor/ dist/
git commit -m "feat: editor UI — three-panel layout with page tree, canvas, layer tree, and property panel"
```

---

### Task 7: End-to-End Integration Test

Verify the full CLI works: start servers, load editor, render a design page, and interact with it.

**Files:**
- No new files

- [ ] **Step 1: Start the CLI and verify design pages render**

```bash
cd /Users/bytedance/t/redesign/cli && npx tsx bin/redesign.ts -c ../design/design.yaml &
sleep 2
# Test design server
curl -s http://localhost:3001/page/cover | head -20
# Test editor server
curl -s http://localhost:3000/ | head -5
# Test API
curl -s http://localhost:3000/api/config
# Cleanup
kill %1
```

Expected:
- Design server returns assembled HTML with `<!DOCTYPE html>`, component registration, inspector script
- Editor server returns the React app HTML
- API returns JSON: `{"pages":["cover","example"],"components":["my-banner"],"designServerUrl":"http://localhost:3001"}`

- [ ] **Step 2: Manual browser test**

```bash
cd /Users/bytedance/t/redesign/cli && npx tsx bin/redesign.ts -c ../design/design.yaml
```

Open `http://localhost:3000` in browser. Verify:
- Left panel shows "cover" and "example" pages
- Clicking a page loads it in the center iframe
- Clicking elements in the iframe shows properties in the right panel
- Layer tree populates with DOM structure
- Ctrl+C to stop

- [ ] **Step 3: Run all unit tests**

```bash
cd /Users/bytedance/t/redesign/cli && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit any fixes if needed**

```bash
cd /Users/bytedance/t/redesign/cli
git add -A
git commit -m "fix: integration adjustments from e2e testing"
```

---

### Task 8: Polish & Final Cleanup

Add .gitignore, clean up any loose ends.

**Files:**
- Create: `cli/.gitignore`
- Create: `.gitignore` (root)

- [ ] **Step 1: Create cli/.gitignore**

```
node_modules/
dist/
```

- [ ] **Step 2: Create root .gitignore**

```
node_modules/
```

- [ ] **Step 3: Run full test suite one final time**

```bash
cd /Users/bytedance/t/redesign/cli && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Final commit**

```bash
cd /Users/bytedance/t/redesign
git add -A
git commit -m "chore: add gitignore and final cleanup"
```
