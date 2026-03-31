import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import type { DesignConfig } from "../types.js";

const PAGE_TEMPLATES_DIR = join(import.meta.dirname, "../../templates/pages");
const COMPONENT_TEMPLATES_DIR = join(import.meta.dirname, "../../templates/components");

const AVAILABLE_PAGE_TEMPLATES = ["blank", "hero", "form", "grid"];

export async function runAdd(config: DesignConfig, args: string[]) {
  const type = args[0];
  const name = args[1];

  if (!type || !name) {
    console.error("Usage: dekit add <page|component> <name> [--template <template>]");
    process.exit(1);
  }

  let template = "blank";
  const templateIdx = args.indexOf("--template");
  if (templateIdx !== -1 && args[templateIdx + 1]) {
    template = args[templateIdx + 1];
  }

  if (type === "page") {
    await addPage(config, name, template);
  } else if (type === "component") {
    await addComponent(config, name);
  } else {
    console.error(`Unknown type: "${type}". Use "page" or "component".`);
    process.exit(1);
  }
}

async function addPage(config: DesignConfig, name: string, template: string) {
  if (config.pages[name]) {
    throw new Error(`Page "${name}" already exists`);
  }

  if (!AVAILABLE_PAGE_TEMPLATES.includes(template)) {
    throw new Error(
      `Unknown page template: "${template}". Available: ${AVAILABLE_PAGE_TEMPLATES.join(", ")}`
    );
  }

  const pageDir = join(config.baseDir, "pages", name);
  mkdirSync(pageDir, { recursive: true });

  const templateDir = join(PAGE_TEMPLATES_DIR, template);
  const htmlSrc = readFileSync(join(templateDir, "page.html"), "utf-8");
  const cssSrc = readFileSync(join(templateDir, "page.css"), "utf-8");

  writeFileSync(join(pageDir, `${name}.html`), htmlSrc.replace(/__PAGE_NAME__/g, name));
  writeFileSync(join(pageDir, `${name}.css`), cssSrc);

  // Update dekit.yaml
  const configPath = join(config.baseDir, "dekit.yaml");
  const raw = yaml.load(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
  const pages = (raw.pages ?? {}) as Record<string, unknown>;
  pages[name] = {
    template: `pages/${name}/${name}.html`,
    style: `pages/${name}/${name}.css`,
  };
  raw.pages = pages;
  writeFileSync(configPath, yaml.dump(raw, { lineWidth: -1 }));

  console.log(`Added page "${name}" (template: ${template})`);
}

async function addComponent(config: DesignConfig, name: string) {
  if (!name.includes("-")) {
    throw new Error(
      `Component name "${name}" must contain a hyphen (Web Components spec)`
    );
  }

  if (config.components[name]) {
    throw new Error(`Component "${name}" already exists`);
  }

  const compDir = join(config.baseDir, "components", name);
  mkdirSync(compDir, { recursive: true });

  const templateDir = join(COMPONENT_TEMPLATES_DIR, "blank");
  const htmlSrc = readFileSync(join(templateDir, "component.html"), "utf-8");
  const cssSrc = readFileSync(join(templateDir, "component.css"), "utf-8");

  writeFileSync(join(compDir, `${name}.html`), htmlSrc);
  writeFileSync(join(compDir, `${name}.css`), cssSrc);

  // Update dekit.yaml
  const configPath = join(config.baseDir, "dekit.yaml");
  const raw = yaml.load(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
  const components = (raw.components ?? {}) as Record<string, unknown>;
  components[name] = {
    template: `components/${name}/${name}.html`,
    style: `components/${name}/${name}.css`,
  };
  raw.components = components;
  writeFileSync(configPath, yaml.dump(raw, { lineWidth: -1 }));

  console.log(`Added component "${name}"`);
}
