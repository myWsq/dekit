# dekit

A design canvas for AI code agents. Write HTML/CSS, preview, screenshot, iterate.

## How It Works

```
Agent writes HTML/CSS  →  dekit renders  →  Agent screenshots  →  Agent sees result  →  Repeat
```

Agents use dekit to create visual designs before writing production code. Humans review in the browser and give feedback via ref protocol.

## Quick Start

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

The agent will:
1. `dekit init --template landing` — scaffold the project
2. Edit the HTML/CSS files
3. `dekit screenshot '$${home}'` — take a screenshot to check its work
4. Iterate until satisfied
5. `dekit serve` — open for human review

### 4. Review and give feedback

Open the browser preview, right-click any element, and **Copy Ref**:

```
> The hero section $${home@.hero} needs more padding, and change the CTA color to blue
```

The agent resolves the ref, locates the code, and makes the change.

## CLI

```
dekit init [path] [--template name]    Create a design project
dekit add page <name>                  Add a page
dekit add component <name>             Add a component
dekit ls                               List pages and components
dekit serve                            Preview in browser
dekit screenshot <ref>                 Screenshot a page or element
dekit resolve <ref>                    Resolve ref to file path + line range
dekit usage                            Print the full agent usage guide
```

Templates: `blank`, `landing`, `dashboard`, `mobile` (projects) / `blank`, `hero`, `form`, `grid` (pages)

## Ref Protocol

```
$${home}              page ref
$${home@.hero}        element ref (CSS selector)
```

Agents don't need to understand the protocol — they pass refs to `dekit resolve` or `dekit screenshot`.

## Configuration

`dekit.yaml`:

```yaml
version: 1.0
global-style: "global.css"

components:
  my-card:
    template: "components/my-card/my-card.html"
    style: "components/my-card/my-card.css"

pages:
  home:
    template: "pages/home/home.html"
    style: "pages/home/home.css"
```

## License

[Apache 2.0](LICENSE)
