import type { DekitRef } from "./types.js";

const REF_PATTERN = /^\$\$\{(.+)\}$/;

export function parseRef(raw: string): DekitRef {
  const match = raw.match(REF_PATTERN);
  if (!match) {
    throw new Error(
      `Invalid ref format: "${raw}". Expected format: \$\${page} or \$\${page@selector}`
    );
  }

  const inner = match[1];
  const atIndex = inner.indexOf("@");

  if (atIndex === -1) {
    if (!inner.trim()) {
      throw new Error("Invalid ref: empty page key");
    }
    return { type: "page", pageKey: inner };
  }

  const pageKey = inner.slice(0, atIndex);
  const selector = inner.slice(atIndex + 1);

  if (!pageKey.trim()) {
    throw new Error("Invalid ref: empty page key");
  }
  if (!selector.trim()) {
    throw new Error("Invalid ref: empty selector after @");
  }

  return { type: "element", pageKey, selector };
}

export function formatPageRef(pageKey: string): string {
  return `\$\${${pageKey}}`;
}

export function formatElementRef(pageKey: string, selector: string): string {
  return `\$\${${pageKey}@${selector}}`;
}
