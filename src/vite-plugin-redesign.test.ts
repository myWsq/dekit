import { describe, test, expect } from "vitest";
import { assemblePageHtml } from "./vite-plugin-redesign.js";
import type { DesignConfig } from "./types.js";
import { join } from "node:path";

const DESIGN_DIR = join(import.meta.dirname, "../../design");

const mockConfig: DesignConfig = {
  version: 1.0,
  globalStyle: "global.css",
  components: {
    "my-banner": {
      template: "components/my-banner/banner.html",
      style: "components/my-banner/banner.css",
    },
  },
  pages: {
    cover: {
      template: "pages/cover/cover.html",
      style: "pages/cover/cover.css",
    },
  },
  baseDir: DESIGN_DIR,
};

describe("assemblePageHtml", () => {
  test("generates valid HTML for a page", async () => {
    const html = await assemblePageHtml(mockConfig, "cover");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("global.css");
    expect(html).toContain("pages/cover/cover.css");
    expect(html).toContain("Welcome to Redesign");
    expect(html).toContain("customElements.define");
    expect(html).toContain("my-banner");
  });

  test("throws for unknown page", async () => {
    await expect(
      assemblePageHtml(mockConfig, "nonexistent")
    ).rejects.toThrow(/not found/i);
  });

  test("includes inspector script", async () => {
    const html = await assemblePageHtml(mockConfig, "cover");
    expect(html).toContain("postMessage");
    expect(html).toContain("NODE_SELECTED");
  });

  test("extracts template inner content for component registration", async () => {
    const html = await assemblePageHtml(mockConfig, "cover");
    expect(html).toContain("class=\"banner\"");
    expect(html).toContain("<slot></slot>");
    expect(html).not.toMatch(/innerHTML\s*=\s*`\s*<template>/);
  });
});
