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
