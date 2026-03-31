# dekit

A design canvas for AI code agents.

Agents write HTML/CSS designs, preview and screenshot them, iterate until satisfied — then humans review in the browser and give feedback.

## What It Does

```
Agent creates design  →  dekit renders it  →  Agent screenshots to check  →  iterates  →  Human reviews
```

- Agent scaffolds a design project with built-in templates (landing page, dashboard, mobile app)
- Agent writes HTML/CSS, takes screenshots to see the result, and self-corrects
- Human opens the browser preview, inspects elements, and gives feedback using refs
- Agent resolves the feedback to exact source code locations and iterates

## Getting Started

### 1. Install

```bash
npm install -g dekit-cli
```

### 2. Set up your agent

Create a skill file (e.g. `.claude/skills/dekit.md`):

```markdown
---
name: dekit
description: Use dekit to create, preview, and iterate on HTML/CSS designs
---
Run `dekit usage` to get the full usage guide.
Follow the guide to complete your design task.
```

### 3. Ask the agent to design

```
> Use dekit to design a landing page for a task management app
```

The agent handles everything — project setup, writing HTML/CSS, taking screenshots to verify, and iterating on the design.

### 4. Review

When the agent is done, it starts the preview server. Open the browser to review.

If something needs changing, right-click any element and **Copy Ref**, then tell the agent:

```
> The hero section $${home@.hero} needs more padding, and make the CTA button blue
```

The agent knows how to resolve refs to source code and make the changes.

## License

[Apache 2.0](LICENSE)
