# Dekit Open Source Design

## Overview

Transform the `redesign` project into an open-source project named **dekit** — a code-first design toolkit that lets developers and designers preview, inspect, and debug HTML/CSS designs in the browser.

**Core decisions:**

- Project name: `dekit` (npm available)
- License: Apache 2.0
- Distribution: npm
- Target audience: Frontend developers + designers/design engineers
- Documentation language: English
- Tech stack: Keep existing Vite + tsx + vitest
- CI/CD: GitHub Actions
- Community: CONTRIBUTING.md, Issue/PR templates (no Code of Conduct, no CHANGELOG)

## 1. Repository Restructure

### Current structure

```
redesign/
├── .claude/
├── .git/
├── .gitignore
├── cli/              ← all source code lives here
│   ├── bin/redesign.ts
│   ├── src/
│   ├── editor/
│   ├── dist/
│   ├── node_modules/
│   ├── package.json
│   ├── tsconfig.json
│   └── bun.lock
├── design/           ← example design files
│   ├── design.yaml
│   ├── global.css
│   ├── components/
│   └── pages/
└── docs/
```

### Target structure

```
dekit/
├── bin/dekit.ts
├── src/
│   ├── design-server.ts
│   ├── editor-server.ts
│   ├── parser.ts
│   ├── parser.test.ts
│   ├── server.ts
│   ├── types.ts
│   ├── vite-plugin-dekit.ts
│   ├── vite-plugin-dekit.test.ts
│   └── injected/
│       ├── inspector.ts
│       └── register-components.ts
├── editor/
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── devices.ts
│       ├── devices.test.ts
│       ├── types.ts
│       └── styles/
├── example/
│   ├── design.yaml
│   ├── global.css
│   ├── components/
│   └── pages/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── publish.yml
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
├── .claude/
│   └── skills/
│       └── release.md
├── package.json
├── tsconfig.json
├── .gitignore
├── .npmignore
├── LICENSE
├── README.md
├── CONTRIBUTING.md
└── PULL_REQUEST_TEMPLATE.md
```

### Key changes

- Hoist all contents of `cli/` to repository root
- Rename `design/` to `example/`
- Remove `docs/` (only contains superpowers internal files; this spec itself is a working artifact, not shipped)
- Rename `bin/redesign.ts` to `bin/dekit.ts`
- Rename `vite-plugin-redesign.ts` to `vite-plugin-dekit.ts` (and its test file)

## 2. Rename All References

Replace all occurrences of "redesign" with "dekit" across the codebase:

- `package.json`: name `redesign-cli` → `dekit`, bin entry `redesign` → `dekit`
- `bin/redesign.ts` → `bin/dekit.ts`: update usage text from `redesign` to `dekit`
- `src/server.ts`: log message "Redesign Dev Server" → "Dekit Dev Server"
- `src/vite-plugin-redesign.ts` → `src/vite-plugin-dekit.ts`: plugin name
- `src/vite-plugin-redesign.test.ts` → `src/vite-plugin-dekit.test.ts`: imports
- Any other code references, comments, or strings containing "redesign"

## 3. Package Configuration

Updated `package.json`:

```json
{
  "name": "dekit",
  "version": "0.1.0",
  "type": "module",
  "description": "A code-first design toolkit — preview, inspect, and debug your HTML/CSS designs in the browser",
  "keywords": ["design", "devtools", "inspector", "preview", "css", "html", "cli"],
  "license": "Apache-2.0",
  "author": "<github-username>",
  "repository": {
    "type": "git",
    "url": "https://github.com/<github-username>/dekit"
  },
  "homepage": "https://github.com/<github-username>/dekit",
  "bugs": {
    "url": "https://github.com/<github-username>/dekit/issues"
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
  }
}
```

Key changes from current:
- Remove `"private": true`
- Add `description`, `keywords`, `license`, `author`, `repository`, `homepage`, `bugs`
- Add `files` to control npm publish contents
- Add `engines` for minimum Node version
- Add `prepublishOnly` to auto-build before publish
- Rename bin entry

## 4. Documentation

### README.md

Structure:
1. Project name + one-line description
2. Features list (device simulation, layer inspection, property panel, HMR, etc.)
3. Quick Start (install → create design.yaml → run)
4. Configuration (design.yaml format)
5. CLI Options (`-c`, `-p`, `--design-port`, `-h`)
6. Contributing link
7. License

### CONTRIBUTING.md

Contents:
- Development environment setup (clone → `npm install` → `npm run dev`)
- Project structure overview (bin/, src/, editor/)
- How to submit a PR
- Code conventions (TypeScript, run tests before submitting)

### Issue templates

**Bug Report** (`.github/ISSUE_TEMPLATE/bug_report.md`):
- Description
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, Node version, browser)

**Feature Request** (`.github/ISSUE_TEMPLATE/feature_request.md`):
- Description
- Motivation / use case
- Possible approach

### PR template

**`.github/PULL_REQUEST_TEMPLATE.md`**:
- What changed
- Related issue
- How to test

## 5. CI/CD

### CI Workflow (`.github/workflows/ci.yml`)

Triggers: push to main, pull requests

Steps:
- Checkout
- Setup Node (matrix: 18, 20)
- `npm install`
- `npm run test`
- `npm run build:editor`

### Publish Workflow (`.github/workflows/publish.yml`)

Triggers: push tag `v*`

Steps:
- Checkout
- Setup Node
- `npm install`
- `npm run build:editor`
- `npm publish`

## 6. Release Skill

Create `.claude/skills/release.md` — an Agent skill invoked via `/release <patch|minor|major>`.

The skill instructs the Agent to:

1. **Bump version** — update `package.json` version based on argument (patch/minor/major)
2. **Generate Release Note** — read git log since last tag, categorize commits by type (feat/fix/breaking/other), format as markdown
3. **Commit + Tag** — `git add package.json && git commit -m "release: v{version}"` then `git tag v{version}`
4. **Push** — `git push && git push --tags`
5. **Create GitHub Release** — `gh release create v{version}` with the generated release note as body

GitHub Actions then picks up the tag and runs `npm publish`.

## 7. Code Cleanup

### .gitignore

```
node_modules/
dist/
.env
.env.*
*.log
.DS_Store
```

### .npmignore

```
example/
.github/
.claude/
.superpowers/
*.test.ts
.gitignore
.DS_Store
```

### Sensitive data scan

Before publishing, scan for:
- Hardcoded file paths (e.g. `/Users/...`)
- API keys, tokens, secrets
- Internal URLs or hostnames

### Test adaptation

- Existing tests (`parser.test.ts`, `vite-plugin-redesign.test.ts`, `devices.test.ts`) must be updated for renames
- Ensure all tests pass after restructure
- No new tests required for MVP

## 8. LICENSE

Apache License 2.0 — standard full text with copyright line:

```
Copyright 2026 <author>
```
