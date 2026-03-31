import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import yaml from "js-yaml";
import type { DesignConfig, ComponentDef, PageDef } from "./types.js";

export async function parseDesignConfig(
  configPath: string,
  rawContent?: string
): Promise<DesignConfig> {
  const absolutePath = resolve(configPath);
  const baseDir = dirname(absolutePath);
  const content = rawContent ?? (await readFile(absolutePath, "utf-8"));
  const doc = yaml.load(content) as Record<string, unknown>;

  if (!doc || typeof doc !== "object") {
    throw new Error("Invalid config: not a valid YAML object");
  }

  if (doc.version == null) {
    throw new Error("Invalid config: missing 'version' field");
  }

  // Validate file paths if the base directory actually exists on disk
  const shouldValidateFiles = existsSync(baseDir);

  const globalStyle = (doc["global-style"] as string) ?? "";
  if (globalStyle && shouldValidateFiles) {
    const globalStylePath = join(baseDir, globalStyle);
    if (!existsSync(globalStylePath)) {
      throw new Error(
        `Global style file not found: ${globalStylePath}`
      );
    }
  }

  const rawComponents =
    (doc.components as Record<string, { template: string; style: string }>) ??
    {};
  const components: Record<string, ComponentDef> = {};
  for (const [key, val] of Object.entries(rawComponents)) {
    if (!key.includes("-")) {
      throw new Error(
        `Component key "${key}" must contain a hyphen (Web Component spec requires it)`
      );
    }
    if (shouldValidateFiles) {
      validateFilePaths(baseDir, key, val.template, val.style);
    }
    components[key] = { template: val.template, style: val.style };
  }

  const rawPages =
    (doc.pages as Record<string, { template: string; style: string }>) ?? {};
  const pages: Record<string, PageDef> = {};
  for (const [key, val] of Object.entries(rawPages)) {
    if (shouldValidateFiles) {
      validateFilePaths(baseDir, key, val.template, val.style);
    }
    pages[key] = { template: val.template, style: val.style };
  }

  return {
    version: doc.version as number,
    globalStyle,
    components,
    pages,
    baseDir,
  };
}

function validateFilePaths(
  baseDir: string,
  key: string,
  template: string,
  style: string
): void {
  const templatePath = join(baseDir, template);
  if (!existsSync(templatePath)) {
    throw new Error(
      `Template file not found for "${key}": ${templatePath}`
    );
  }
  const stylePath = join(baseDir, style);
  if (!existsSync(stylePath)) {
    throw new Error(
      `Style file not found for "${key}": ${stylePath}`
    );
  }
}
