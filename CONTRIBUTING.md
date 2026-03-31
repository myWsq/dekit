# Contributing to Dekit

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/myWsq/dekit.git
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
