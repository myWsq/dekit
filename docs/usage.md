# Dekit — Agent Usage Guide

Dekit is a design canvas for code agents. You write HTML/CSS, dekit renders and screenshots it.

## Core Concepts

- **Page**: An HTML file + CSS file registered in `dekit.yaml`
- **Component**: A reusable Web Component (custom element with shadow DOM)
- **Ref**: A reference to a page or element: `$${page}` or `$${page@selector}`

## Quick Start

```bash
# Initialize a new design project
dekit init my-design --template landing

# Preview in browser
cd my-design
dekit serve

# Take a screenshot
dekit screenshot '$${home}'
```

## CLI Reference

### dekit init [path] [--template name]

Initialize a design project. Templates: `blank`, `landing`, `dashboard`, `mobile`.

```bash
dekit init                           # In current directory, blank template
dekit init design/                   # In subdirectory
dekit init --template landing        # With template
dekit init --template                # List available templates
```

### dekit add page <name> [--template name]

Add a page. Templates: `blank`, `hero`, `form`, `grid`.

```bash
dekit add page about
dekit add page pricing --template grid
```

### dekit add component <name>

Add a Web Component (name must contain a hyphen).

```bash
dekit add component my-card
```

### dekit ls

List all pages and components.

### dekit serve [-p port] [--no-open]

Start the interactive preview server.

### dekit screenshot <ref> [options]

Take a screenshot. Output path is printed to stdout.

```bash
dekit screenshot '$${home}'                    # Full page
dekit screenshot '$${home@.hero}'              # Element only
dekit screenshot '$${home}' --device iphone-14 # Device size
dekit screenshot '$${home}' --full-page        # Include scroll
dekit screenshot '$${home}' -o my-shot.png     # Custom output
dekit screenshot --all                         # All pages
```

### dekit resolve <ref>

Resolve a ref to source file path and line range.

```bash
dekit resolve '$${home}'
# → pages/home/home.html

dekit resolve '$${home@.hero}'
# → pages/home/home.html:1-10
```

### dekit usage

Print this guide.

## Ref Protocol

Format: `$${page-key}` or `$${page-key@css-selector}`

When you see a `$${...}` pattern, pass it to `dekit resolve` or `dekit screenshot`.

- `dekit resolve <ref>` → file path + line range
- `dekit screenshot <ref>` → screenshot file path

## Design Loop

```
1. dekit init --template landing     # Start project
2. Edit HTML/CSS files               # Make changes
3. dekit screenshot '$${home}'       # See result
4. Analyze the screenshot            # Check quality
5. Edit again                        # Fix issues
6. Repeat 3-5                        # Until satisfied
```

## dekit.yaml Format

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
