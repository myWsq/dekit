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

All design files live inside a `.dekit/` directory, keeping your project clean:

```
your-project/
└── .dekit/
    ├── dekit.yaml          ← config
    ├── global.css
    ├── pages/
    ├── components/
    └── screenshots/
```

## Getting Started

### 1. Install

```bash
npm install -g dekit-cli
```

### 2. Set up your agent

Create a skill file at `.claude/skills/dekit/SKILL.md`:

```markdown
---
name: dekit
description: Use dekit to create, preview, and iterate on HTML/CSS designs
---
Run `dekit usage` to get the full usage guide.
Follow the guide to complete your design task.
```

## Examples

**Design a landing page:**

```
> Use dekit to design a landing page for a task management app
```

The agent handles everything — project setup, writing HTML/CSS, taking screenshots to verify, and iterating on the design.

**Design for mobile:**

```
> Use dekit to design a mobile app for a fitness tracker, use the mobile template
```

**Add to an existing project:**

```
> Initialize a dekit design project using the dashboard template
```

The agent creates a `.dekit/` directory with all the scaffolding, without touching your existing code.

**Review and give feedback:**

When the agent starts the preview server, open the browser to review. Right-click any element and **Copy Ref**, then tell the agent what to change:

```
> The hero section $${home@.hero} needs more padding, and make the CTA button blue
```

**Add pages and components:**

```
> Add a pricing page with a 3-tier card layout
> Create a ui-card component with an image slot and body slot
```

## License

[Apache 2.0](LICENSE)
