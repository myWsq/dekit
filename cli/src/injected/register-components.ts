import type { ComponentDef } from "../types.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

function tagNameToClassName(tagName: string): string {
  return tagName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function extractTemplateContent(html: string): string {
  const match = html.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
  return match ? match[1].trim() : html.trim();
}

export async function generateComponentRegistrationScript(
  components: Record<string, ComponentDef>,
  baseDir: string
): Promise<string> {
  const registrations: string[] = [];

  for (const [tagName, def] of Object.entries(components)) {
    const templateHtml = await readFile(join(baseDir, def.template), "utf-8");
    const styleContent = await readFile(join(baseDir, def.style), "utf-8");
    const innerContent = extractTemplateContent(templateHtml);
    const className = tagNameToClassName(tagName);

    // Escape backticks and ${} in content for use inside template literals
    const escapedInnerContent = innerContent
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");
    const escapedStyleContent = styleContent
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");

    registrations.push(`
class ${className} extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = \`${escapedStyleContent}\`;
    shadow.appendChild(style);
    const tpl = document.createElement('template');
    tpl.innerHTML = \`${escapedInnerContent}\`;
    shadow.appendChild(tpl.content.cloneNode(true));
  }
}
customElements.define(${JSON.stringify(tagName)}, ${className});
`);
  }

  return registrations.join("\n");
}
