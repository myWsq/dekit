import { describe, test, expect } from "vitest";
import { assemblePageHtml, resolvePageProps } from "./vite-plugin-dekit.js";
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

  test("injects __DEKIT_PROPS__ when page has properties", async () => {
    const configWithProps: DesignConfig = {
      ...mockConfig,
      pages: {
        home: {
          ...mockConfig.pages["home"],
          properties: {
            showBanner: { type: "boolean", default: true },
            count: { type: "number", default: 3 },
          },
        },
      },
    };
    const html = await assemblePageHtml(configWithProps, "home");
    expect(html).toContain("window.__DEKIT_PROPS__");
    expect(html).toContain('"showBanner":true');
    expect(html).toContain('"count":3');
  });

  test("does not inject __DEKIT_PROPS__ when page has no properties", async () => {
    const html = await assemblePageHtml(mockConfig, "home");
    expect(html).not.toContain("__DEKIT_PROPS__");
  });

  test("props override applies over defaults", async () => {
    const configWithProps: DesignConfig = {
      ...mockConfig,
      pages: {
        home: {
          ...mockConfig.pages["home"],
          properties: {
            showBanner: { type: "boolean", default: true },
            count: { type: "number", default: 3 },
          },
        },
      },
    };
    const html = await assemblePageHtml(configWithProps, "home", {
      props: { showBanner: "false", count: "10" },
    });
    expect(html).toContain('"showBanner":false');
    expect(html).toContain('"count":10');
  });
});

describe("resolvePageProps", () => {
  test("returns defaults when no overrides", () => {
    const result = resolvePageProps({
      properties: {
        flag: { type: "boolean", default: true },
        num: { type: "number", default: 5 },
        str: { type: "string", default: "hi" },
      },
    });
    expect(result).toEqual({ flag: true, num: 5, str: "hi" });
  });

  test("overrides convert types based on schema", () => {
    const result = resolvePageProps(
      {
        properties: {
          flag: { type: "boolean", default: true },
          num: { type: "number", default: 5 },
          str: { type: "string", default: "hi" },
        },
      },
      { flag: "false", num: "42", str: "world" }
    );
    expect(result).toEqual({ flag: false, num: 42, str: "world" });
  });

  test("ignores unknown override keys", () => {
    const result = resolvePageProps(
      { properties: { flag: { type: "boolean", default: true } } },
      { flag: "false", unknown: "value" }
    );
    expect(result).toEqual({ flag: false });
  });

  test("returns empty object when no properties defined", () => {
    expect(resolvePageProps({})).toEqual({});
    expect(resolvePageProps({ properties: undefined })).toEqual({});
  });
});
