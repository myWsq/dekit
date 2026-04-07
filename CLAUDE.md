# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

dekit — a code-first design canvas for AI agents. Agents write HTML/CSS designs, preview and screenshot them, iterate until satisfied, then humans review in the browser and give feedback via element references.

## Commands

```bash
npm run dev              # Dev server using example/.dekit/dekit.yaml
npm run dev:editor       # Vite dev server for editor React app (port 5173)
npm run build:editor     # Build editor → dist/editor/
npm test                 # Run all tests (vitest)
npx vitest run src/ref.test.ts        # Run a single test file
npx vitest run -t "parseRef"          # Run tests matching name
```

## Architecture

The system has three layers that work together:

### CLI (`bin/dekit.ts` → `src/cli/`)
Entry point dispatches to subcommands: `init`, `add`, `ls`, `resolve`, `screenshot`, `usage`, `serve`. Each command is an async function exported from its own file (e.g., `src/cli/init.ts` exports `runInit`).

### Two Servers (`src/server.ts` orchestrates both)
- **Design Server** (`src/design-server.ts`) — Vite dev server that renders HTML/CSS pages. Uses a custom Vite plugin (`src/vite-plugin-dekit.ts`) to serve pages at `/page/{name}` and design assets at `/@design/`. Injects inspector script and Web Component registration into pages.
- **Editor Server** (`src/editor-server.ts`) — HTTP server (port 7980) serving the React editor app. Exposes `/api/config` returning page/component metadata and the design server URL.

### Editor (`editor/src/App.tsx`)
Single-file React app (~24KB). Renders design pages in an `<iframe>` pointed at the design server. Communication with the iframe is via `postMessage` — the injected inspector script (`src/injected/inspector.ts`) sends `NODE_SELECTED`, `NODE_HOVERED`, `CONTEXT_MENU`, `DOM_TREE` events; the editor sends back `GET_DOM_TREE`, `HIGHLIGHT_NODE`, `SET_INSPECT_MODE`, etc.

### Key Subsystems
- **Ref system** (`src/ref.ts`, `src/parser.ts`) — `$${page}` or `$${page@selector}` syntax links human feedback to source code. `resolve` command maps refs to file paths + line ranges.
- **Injected scripts** (`src/injected/`) — `inspector.ts` generates inline JS for DOM inspection overlays; `register-components.ts` converts component HTML/CSS into Web Component class definitions using Shadow DOM.
- **Template system** (`templates/`) — three categories: `projects/` (full project scaffolds for `init`), `pages/` (for `add page`), `components/` (for `add component`). Copied via `cpSync`, may contain `__PAGE_NAME__` placeholders.
- **Screenshot** (`src/chrome.ts`, `src/cli/screenshot.ts`) — finds Chrome/Chromium on the system, uses puppeteer-core to render pages or clip to specific elements.

## Conventions

- **ESM only** — `"type": "module"`, all local imports use `.js` extension (e.g., `import { parseRef } from "./ref.js"`)
- **TypeScript strict mode** — shared interfaces in `src/types.ts` and `editor/src/types.ts`
- **Tests** — Vitest, `.test.ts` files colocated with source. File I/O tests use `mkdtempSync`/`rmSync` for temp directory isolation. Console output tested via `vi.spyOn(console, "log")`.
- **Pages are body-only HTML** — no `<html>`, `<head>`, or `<body>` tags; the Vite plugin wraps them.
- **Component names must contain a hyphen** — Web Components spec requirement (e.g., `ui-card`).
- **All design files live in `.dekit/`** — config at `.dekit/dekit.yaml`, pages in `.dekit/pages/`, components in `.dekit/components/`.
- **Config format** — `dekit.yaml` with `version`, `global-style`, `pages`, and `components` sections, parsed by `src/parser.ts`.
