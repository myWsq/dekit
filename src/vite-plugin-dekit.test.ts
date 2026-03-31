import { describe, test, expect } from "vitest";
import { assemblePageHtml } from "./vite-plugin-dekit.js";
import type { DesignConfig } from "./types.js";
import { join } from "node:path";

const DESIGN_DIR = join(import.meta.dirname, "../example/.dekit");

const mockConfig: DesignConfig = {
  version: 1.0,
  globalStyle: "global.css",
  components: {
    "ui-card": {
      template: "components/ui-card/ui-card.html",
      style: "components/ui-card/ui-card.css",
    },
    "ui-button": {
      template: "components/ui-button/ui-button.html",
      style: "components/ui-button/ui-button.css",
    },
  },
  pages: {
    home: {
      template: "pages/home/home.html",
      style: "pages/home/home.css",
    },
    showcase: {
      template: "pages/showcase/showcase.html",
      style: "pages/showcase/showcase.css",
    },
  },
  baseDir: DESIGN_DIR,
};

describe("assemblePageHtml", () => {
  test("generates valid HTML for a page", async () => {
    const html = await assemblePageHtml(mockConfig, "home");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("global.css");
    expect(html).toContain("pages/home/home.css");
    expect(html).toContain("customElements.define");
    expect(html).toContain("ui-card");
  });

  test("throws for unknown page", async () => {
    await expect(
      assemblePageHtml(mockConfig, "nonexistent")
    ).rejects.toThrow(/not found/i);
  });

  test("includes inspector script", async () => {
    const html = await assemblePageHtml(mockConfig, "home");
    expect(html).toContain("postMessage");
    expect(html).toContain("NODE_SELECTED");
  });

  test("extracts template inner content for component registration", async () => {
    const html = await assemblePageHtml(mockConfig, "showcase");
    expect(html).toContain("class=\"card\"");
    expect(html).toContain("<slot></slot>");
    expect(html).not.toMatch(/innerHTML\s*=\s*`\s*<template>/);
  });
});
