# Dekit Open Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the `redesign` project into an open-source project named `dekit`, ready for npm publication.

**Architecture:** Hoist `cli/` contents to repo root, rename `design/` to `example/`, rename all `redesign` references to `dekit`, add open-source infrastructure (LICENSE, README, CONTRIBUTING, CI/CD, release skill).

**Tech Stack:** TypeScript, Vite, React, vitest, GitHub Actions

---

### Task 1: Restructure repository — hoist cli/ to root

**Files:**
- Move: `cli/bin/` → `bin/`
- Move: `cli/src/` → `src/`
- Move: `cli/editor/` → `editor/`
- Move: `cli/package.json` → `package.json`
- Move: `cli/tsconfig.json` → `tsconfig.json`
- Move: `cli/bun.lock` → `bun.lock`
- Move: `cli/.gitignore` → merge into root `.gitignore`
- Rename: `design/` → `example/`
- Delete: `cli/` (empty after move)
- Delete: `cli/node_modules/` (will reinstall)
- Delete: `cli/dist/` (will rebuild)
- Delete: `docs/` (superpowers working artifacts only)

- [ ] **Step 1: Move cli/ contents to repo root**

```bash
cd /Users/bytedance/t/redesign
# Move all cli/ contents (except node_modules and dist) to root
mv cli/bin .
mv cli/src .
mv cli/editor .
mv cli/package.json .
mv cli/tsconfig.json .
mv cli/bun.lock .
```

- [ ] **Step 2: Rename design/ to example/**

```bash
cd /Users/bytedance/t/redesign
mv design example
```

- [ ] **Step 3: Merge .gitignore files and clean up**

Write the root `.gitignore` with combined content:

```
node_modules/
dist/
.env
.env.*
*.log
.DS_Store
```

- [ ] **Step 4: Remove leftover directories**

```bash
cd /Users/bytedance/t/redesign
rm -rf cli
rm -rf docs
```

- [ ] **Step 5: Install dependencies at new root**

```bash
cd /Users/bytedance/t/redesign
npm install
```

Expected: `node_modules/` created at root, no errors.

- [ ] **Step 6: Verify structure**

```bash
cd /Users/bytedance/t/redesign
ls -la
```

Expected: `bin/`, `src/`, `editor/`, `example/`, `package.json`, `tsconfig.json`, `bun.lock`, `.gitignore` all at root level.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: hoist cli/ to repo root, rename design/ to example/"
```

---

### Task 2: Rename all redesign references to dekit

**Files:**
- Rename: `bin/redesign.ts` → `bin/dekit.ts`
- Rename: `src/vite-plugin-redesign.ts` → `src/vite-plugin-dekit.ts`
- Rename: `src/vite-plugin-redesign.test.ts` → `src/vite-plugin-dekit.test.ts`
- Modify: `bin/dekit.ts` (usage text)
- Modify: `src/vite-plugin-dekit.ts` (plugin name, function name)
- Modify: `src/vite-plugin-dekit.test.ts` (import path, test content)
- Modify: `src/design-server.ts` (import path, function name)
- Modify: `src/server.ts` (log message)
- Modify: `src/injected/inspector.ts` (DOM element IDs)
- Modify: `editor/index.html` (title)
- Modify: `example/pages/cover/cover.html` (text content)
- Modify: `package.json` (name, bin, scripts)

- [ ] **Step 1: Rename files**

```bash
cd /Users/bytedance/t/redesign
mv bin/redesign.ts bin/dekit.ts
mv src/vite-plugin-redesign.ts src/vite-plugin-dekit.ts
mv src/vite-plugin-redesign.test.ts src/vite-plugin-dekit.test.ts
```

- [ ] **Step 2: Update bin/dekit.ts**

Replace the shebang line and usage text. The full updated file:

```ts
#!/usr/bin/env tsx
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { parseDesignConfig } from "../src/parser.js";
import { startServers } from "../src/server.js";

function printUsage() {
  console.log(`
Usage: dekit [-c <design.yaml>]

Options:
  -c, --config       Path to design.yaml (default: ./design.yaml or ./design.yml)
  -p, --port         Editor server port (default: 3000)
  --design-port      Design server port (default: 3001)
  -h, --help         Show this help message
`);
}

function findDefaultConfig(): string | undefined {
  for (const name of ["design.yaml", "design.yml"]) {
    const p = resolve(name);
    if (existsSync(p)) return p;
  }
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

  const configPath = args.config
    ? resolve(args.config)
    : findDefaultConfig();

  if (!configPath) {
    console.error(
      "Error: no design.yaml or design.yml found in current directory. Use -c to specify a config file.\n"
    );
    printUsage();
    process.exit(1);
  }
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

- [ ] **Step 3: Update src/vite-plugin-dekit.ts**

Rename the exported function and plugin name. Change line 47 and 49:

```ts
// line 47: rename function
export function dekitPlugin(configRef: { current: DesignConfig }): Plugin {
  return {
    name: "vite-plugin-dekit",
```

- [ ] **Step 4: Update src/vite-plugin-dekit.test.ts**

Update the import path on line 2 and the test assertion on line 32:

```ts
// line 2
import { assemblePageHtml } from "./vite-plugin-dekit.js";

// line 6: update DESIGN_DIR to point to example/ (now sibling, not ../../design)
const DESIGN_DIR = join(import.meta.dirname, "../example");

// line 32: update text assertion to match new example content
    expect(html).toContain("Welcome to Dekit");
```

- [ ] **Step 5: Update src/design-server.ts**

Update import path (line 3) and function call (line 17):

```ts
// line 3
import { dekitPlugin } from "./vite-plugin-dekit.js";

// line 17
    plugins: [dekitPlugin(configRef)],
```

- [ ] **Step 6: Update src/server.ts**

Update log message on line 14:

```ts
  console.log("\n  Dekit Dev Server\n");
```

- [ ] **Step 7: Update src/injected/inspector.ts**

Replace all `__redesign_` prefixes with `__dekit_`. There are 4 occurrences:

```
Line 14: el.id = '__dekit_overlay__';
Line 187: if (tagName === 'script' || tagName === 'style' || node.id === '__dekit_overlay__') return null;
Line 262: let touchStyle = document.getElementById('__dekit_touch_cursor__');
Line 266: touchStyle.id = '__dekit_touch_cursor__';
```

- [ ] **Step 8: Update editor/index.html**

Change the title on line 6:

```html
  <title>Dekit Editor</title>
```

- [ ] **Step 9: Update example/pages/cover/cover.html**

Update the text content to reference dekit:

```html
<div class="cover-page">
  <my-banner>Welcome to Dekit</my-banner>
  <p class="subtitle">A code-first design toolkit</p>
</div>
```

- [ ] **Step 10: Update package.json**

Replace the entire file with:

```json
{
  "name": "dekit",
  "version": "0.1.0",
  "type": "module",
  "description": "A code-first design toolkit — preview, inspect, and debug your HTML/CSS designs in the browser",
  "keywords": ["design", "devtools", "inspector", "preview", "css", "html", "cli"],
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/user/dekit"
  },
  "homepage": "https://github.com/user/dekit",
  "bugs": {
    "url": "https://github.com/user/dekit/issues"
  },
  "bin": {
    "dekit": "./bin/dekit.ts"
  },
  "files": [
    "bin/",
    "src/",
    "editor/",
    "dist/"
  ],
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "dev": "tsx bin/dekit.ts",
    "build:editor": "vite build --config editor/vite.config.ts",
    "test": "vitest run",
    "prepublishOnly": "npm run build:editor"
  },
  "dependencies": {
    "js-yaml": "^4.1.0",
    "open": "^10.1.0",
    "overlayscrollbars": "^2.14.0",
    "overlayscrollbars-react": "^0.5.6",
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

- [ ] **Step 11: Update src/parser.test.ts**

Update the DESIGN_DIR path on line 5 to point to `example/` instead of `../../design`:

```ts
const DESIGN_DIR = join(import.meta.dirname, "../example");
```

- [ ] **Step 12: Run tests to verify renames**

```bash
cd /Users/bytedance/t/redesign
npm run test
```

Expected: All tests pass (parser, vite-plugin-dekit, devices).

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "refactor: rename redesign to dekit across entire codebase"
```

---

### Task 3: Add LICENSE file

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: Create Apache 2.0 LICENSE file**

Create `LICENSE` with the standard Apache License 2.0 full text. The copyright line:

```
Copyright 2026 Dekit Contributors
```

Use the standard Apache 2.0 license body from https://www.apache.org/licenses/LICENSE-2.0.txt

- [ ] **Step 2: Commit**

```bash
git add LICENSE
git commit -m "docs: add Apache 2.0 license"
```

---

### Task 4: Add README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```markdown
# dekit

A code-first design toolkit — preview, inspect, and debug your HTML/CSS designs in the browser.

## Features

- **Live Preview** — see your HTML/CSS designs rendered in a browser with hot reload
- **Device Simulation** — preview on iPhone, iPad, Android, desktop, or custom dimensions
- **Element Inspector** — click any element to see its computed styles, box model, and attributes
- **Layer Tree** — navigate your DOM structure with a visual layer panel
- **Web Components** — define reusable components with `<template>` + CSS
- **YAML Configuration** — simple `design.yaml` to define pages, components, and styles

## Quick Start

Install globally:

```bash
npm install -g dekit
```

Create a `design.yaml` in your project:

```yaml
version: 1.0
global-style: "global.css"

components:
  my-button:
    template: "components/my-button/button.html"
    style: "components/my-button/button.css"

pages:
  home:
    template: "pages/home/home.html"
    style: "pages/home/home.css"
```

Run:

```bash
dekit
```

The editor opens at `http://localhost:3000`.

## Configuration

### design.yaml

| Field | Description |
|-------|-------------|
| `version` | Config version (currently `1.0`) |
| `global-style` | Path to a global CSS file applied to all pages |
| `components` | Map of Web Component tag names to their template and style files |
| `pages` | Map of page names to their template and style files |

Component tag names must contain a hyphen (`my-button`, not `button`) per the Web Components spec.

## CLI Options

```
Usage: dekit [-c <design.yaml>]

Options:
  -c, --config       Path to design.yaml (default: ./design.yaml or ./design.yml)
  -p, --port         Editor server port (default: 3000)
  --design-port      Design server port (default: 3001)
  -h, --help         Show this help message
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[Apache 2.0](LICENSE)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

### Task 5: Add CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Create CONTRIBUTING.md**

```markdown
# Contributing to Dekit

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/user/dekit.git
cd dekit

# Install dependencies
npm install

# Start the dev server (uses the example/ directory)
cd example
npx tsx ../bin/dekit.ts
```

The editor opens at `http://localhost:3000`.

## Project Structure

```
bin/          CLI entry point
src/          Core server and plugin code
  injected/   Scripts injected into the design iframe (inspector, component registration)
editor/       React-based editor UI (built with Vite)
example/      Example design project for development and testing
```

## Running Tests

```bash
npm run test
```

## Building the Editor

```bash
npm run build:editor
```

This outputs the production editor bundle to `dist/editor/`.

## Submitting a Pull Request

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npm run test` to make sure tests pass
4. Run `npm run build:editor` to make sure the editor builds
5. Submit a PR with a clear description of what changed and why

## Code Conventions

- TypeScript for all source code
- Use `vitest` for tests
- Keep commits focused — one logical change per commit
```

- [ ] **Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add contributing guide"
```

---

### Task 6: Add Issue and PR templates

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`

- [ ] **Step 1: Create bug report template**

Create `.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: Bug Report
about: Report a bug
labels: bug
---

## Description

A clear description of the bug.

## Steps to Reproduce

1. Run `dekit` with...
2. Open the editor...
3. Click on...

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened.

## Environment

- OS: [e.g. macOS 14, Ubuntu 22.04]
- Node: [e.g. 20.11.0]
- Browser: [e.g. Chrome 122]
- Dekit version: [e.g. 0.1.0]
```

- [ ] **Step 2: Create feature request template**

Create `.github/ISSUE_TEMPLATE/feature_request.md`:

```markdown
---
name: Feature Request
about: Suggest an idea
labels: enhancement
---

## Description

What would you like to see added?

## Motivation

Why is this useful? What problem does it solve?

## Possible Approach

Optional: ideas on how this could be implemented.
```

- [ ] **Step 3: Create PR template**

Create `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## What Changed

Describe your changes.

## Related Issue

Closes #

## How to Test

Steps to verify this change works correctly.
```

- [ ] **Step 4: Commit**

```bash
git add .github/
git commit -m "docs: add issue and PR templates"
```

---

### Task 7: Add GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm install
      - run: npm run test
      - run: npm run build:editor
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add test and build workflow"
```

---

### Task 8: Add GitHub Actions publish workflow

**Files:**
- Create: `.github/workflows/publish.yml`

- [ ] **Step 1: Create publish workflow**

Create `.github/workflows/publish.yml`:

```yaml
name: Publish

on:
  push:
    tags:
      - "v*"

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
          cache: npm
      - run: npm install
      - run: npm run build:editor
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "ci: add npm publish workflow on tag push"
```

---

### Task 9: Add .npmignore

**Files:**
- Create: `.npmignore`

- [ ] **Step 1: Create .npmignore**

```
example/
.github/
.claude/
.superpowers/
*.test.ts
.gitignore
.DS_Store
docs/
```

- [ ] **Step 2: Commit**

```bash
git add .npmignore
git commit -m "chore: add .npmignore to control published files"
```

---

### Task 10: Add release skill

**Files:**
- Create: `.claude/skills/release.md`

- [ ] **Step 1: Create the release skill**

Create `.claude/skills/release.md`:

````markdown
---
name: release
description: Bump version, generate release notes, tag, push, and create a GitHub Release. Usage: /release <patch|minor|major>
---

# Release

Automate the release process for dekit.

**Argument:** `patch`, `minor`, or `major` (required). This determines how the version number is bumped following semver.

## Steps

### 1. Validate argument

The argument must be one of: `patch`, `minor`, `major`. If missing or invalid, print usage and stop:

```
Usage: /release <patch|minor|major>
```

### 2. Ensure clean working tree

Run `git status --porcelain`. If there are uncommitted changes, stop and ask the user to commit or stash first.

### 3. Ensure on main branch

Run `git branch --show-current`. If not on `main`, warn the user and ask for confirmation before proceeding.

### 4. Bump version

Read `package.json`, parse the current `version` field, and bump it according to the argument:

- `patch`: `0.1.0` → `0.1.1`
- `minor`: `0.1.0` → `0.2.0`
- `major`: `0.1.0` → `1.0.0`

Write the updated version back to `package.json`.

### 5. Generate release notes

Run `git log` from the last tag (or from the first commit if no tags exist) to HEAD:

```bash
git log $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD --oneline
```

Categorize each commit by its conventional commit prefix:

- **Breaking Changes** — commits with `!:` or `BREAKING CHANGE` in body
- **Features** — commits starting with `feat:`
- **Bug Fixes** — commits starting with `fix:`
- **Other** — everything else

Format as markdown:

```markdown
## What's Changed

### Features
- description (hash)

### Bug Fixes
- description (hash)

### Other
- description (hash)
```

Omit empty sections. If a section has no items, don't include it.

### 6. Commit and tag

```bash
git add package.json
git commit -m "release: v<new-version>"
git tag v<new-version>
```

### 7. Push

```bash
git push
git push --tags
```

### 8. Create GitHub Release

```bash
gh release create v<new-version> --title "v<new-version>" --notes "<release-notes-from-step-5>"
```

### 9. Confirm

Print a summary:

```
Released v<new-version>
- GitHub Release: https://github.com/<owner>/<repo>/releases/tag/v<new-version>
- npm publish will be triggered by the v* tag via GitHub Actions
```
````

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/release.md
git commit -m "feat: add /release skill for automated releases"
```

---

### Task 11: Sensitive data scan and final .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Scan for hardcoded paths and secrets**

```bash
cd /Users/bytedance/t/redesign
grep -r "/Users/" --include="*.ts" --include="*.tsx" --include="*.json" . | grep -v node_modules | grep -v ".git/"
grep -rE "(api[_-]?key|token|secret|password)" --include="*.ts" --include="*.tsx" --include="*.json" -i . | grep -v node_modules | grep -v ".git/"
```

Expected: No matches (or only test fixtures with fake paths like `/fake/design.yaml`). If any real paths or secrets are found, remove them.

- [ ] **Step 2: Verify .gitignore is complete**

Read the current `.gitignore` and confirm it includes:

```
node_modules/
dist/
.env
.env.*
*.log
.DS_Store
```

If anything is missing, add it.

- [ ] **Step 3: Commit if changes were needed**

```bash
git add .gitignore
git commit -m "chore: finalize .gitignore"
```

Only commit if the file was changed.

---

### Task 12: Run full verification

- [ ] **Step 1: Run all tests**

```bash
cd /Users/bytedance/t/redesign
npm run test
```

Expected: All tests pass.

- [ ] **Step 2: Build the editor**

```bash
npm run build:editor
```

Expected: Build succeeds, `dist/editor/` contains `index.html` and JS/CSS assets.

- [ ] **Step 3: Verify the CLI runs with the example project**

```bash
cd /Users/bytedance/t/redesign/example
npx tsx ../bin/dekit.ts &
sleep 2
curl -s http://localhost:3000 | head -20
curl -s http://localhost:3000/api/config
kill %1
```

Expected: Editor HTML is served at port 3000. `/api/config` returns JSON with pages `["cover", "example"]`.

- [ ] **Step 4: Verify npm pack contents**

```bash
cd /Users/bytedance/t/redesign
npm pack --dry-run 2>&1
```

Expected: Only `bin/`, `src/`, `editor/`, `dist/`, `package.json`, `README.md`, `LICENSE` are included. No `example/`, `.github/`, `.claude/`, test files.

- [ ] **Step 5: Commit any fixes if needed, then final status check**

```bash
git status
git log --oneline -10
```

Expected: Clean working tree, all commits present.
