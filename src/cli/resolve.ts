import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { DesignConfig } from "../types.js";
import { parseRef } from "../ref.js";

export async function runResolve(config: DesignConfig, args: string[]) {
  const refStr = args[0];
  if (!refStr) {
    console.error("Usage: dekit resolve <ref>");
    process.exit(1);
  }

  const ref = parseRef(refStr);

  const pageDef = config.pages[ref.pageKey];
  if (!pageDef) {
    throw new Error(`Page "${ref.pageKey}" not found in dekit.yaml`);
  }

  const templatePath = join(config.baseDir, pageDef.template);
  const relPath = relative(process.cwd(), templatePath);

  if (ref.type === "page") {
    console.log(relPath);
    return;
  }

  // Try to find the element in the source HTML by selector heuristic
  const html = readFileSync(templatePath, "utf-8");
  const range = findSelectorInHtml(html, ref.selector);

  if (range) {
    console.log(`${relPath}:${range.start}-${range.end}`);
  } else {
    console.log(relPath);
  }
}

interface LineRange {
  start: number;
  end: number;
}

function findSelectorInHtml(html: string, selector: string): LineRange | null {
  let searchPattern: RegExp | null = null;

  if (selector.startsWith("#")) {
    const id = selector.slice(1);
    searchPattern = new RegExp(`id=["']${escapeRegex(id)}["']`);
  } else if (selector.startsWith(".")) {
    const cls = selector.slice(1).split(/[.\s]/)[0];
    searchPattern = new RegExp(`class=["'][^"']*\\b${escapeRegex(cls)}\\b[^"']*["']`);
  } else {
    const tag = selector.split(/[:.\s>\[]/)[0];
    if (tag) {
      searchPattern = new RegExp(`<${escapeRegex(tag)}[\\s>]`);
    }
  }

  if (!searchPattern) return null;

  const lines = html.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (searchPattern.test(lines[i])) {
      const startLine = i + 1;
      const endLine = findClosingLine(lines, i);
      return { start: startLine, end: endLine };
    }
  }

  return null;
}

function findClosingLine(lines: string[], openLine: number): number {
  const openIndent = lines[openLine].search(/\S/);
  for (let i = openLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const indent = line.search(/\S/);
    if (indent <= openIndent && line.trim().startsWith("</")) {
      return i + 1;
    }
    if (indent < openIndent && !line.trim().startsWith("</")) {
      return i;
    }
  }
  return lines.length;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
