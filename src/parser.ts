import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import yaml from "js-yaml";
import type { DesignConfig, DeviceConfig, ComponentDef, PageDef, PropertyDef, PropertyType } from "./types.js";
import { DEVICE_PRESETS } from "./devices.js";

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

  const device = parseDevice(doc.device);

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
    (doc.pages as Record<string, { template: string; style: string; properties?: Record<string, unknown> }>) ?? {};
  const pages: Record<string, PageDef> = {};
  for (const [key, val] of Object.entries(rawPages)) {
    if (shouldValidateFiles) {
      validateFilePaths(baseDir, key, val.template, val.style);
    }
    const properties = val.properties ? parseProperties(key, val.properties) : undefined;
    pages[key] = { template: val.template, style: val.style, properties };
  }

  return {
    version: doc.version as number,
    globalStyle,
    device,
    components,
    pages,
    baseDir,
  };
}

function parseDevice(raw: unknown): DeviceConfig | undefined {
  if (raw == null) return undefined;

  if (typeof raw === "string") {
    const normalizedInput = raw.toLowerCase().replace(/\s+/g, "-");
    const preset = DEVICE_PRESETS.find(
      (d) => d.name.toLowerCase().replace(/\s+/g, "-") === normalizedInput
    );
    if (!preset) {
      throw new Error(
        `Unknown device: "${raw}". Available: ${DEVICE_PRESETS.map((d) => d.name).join(", ")}`
      );
    }
    return { width: preset.width, height: preset.height, dpr: preset.dpr, name: preset.name };
  }

  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const width = obj.width;
    const height = obj.height;
    if (typeof width !== "number" || typeof height !== "number") {
      throw new Error("Device config must have numeric 'width' and 'height'");
    }
    const dpr = typeof obj.dpr === "number" ? obj.dpr : 1;
    return { width, height, dpr };
  }

  throw new Error("Invalid device config: expected a device name string or {width, height, dpr} object");
}

const VALID_PROPERTY_TYPES: PropertyType[] = ["boolean", "number", "string"];

function parseProperties(
  pageKey: string,
  raw: Record<string, unknown>
): Record<string, PropertyDef> {
  const result: Record<string, PropertyDef> = {};
  for (const [name, def] of Object.entries(raw)) {
    if (!def || typeof def !== "object") {
      throw new Error(
        `Invalid property "${name}" on page "${pageKey}": expected {type, default}`
      );
    }
    const obj = def as Record<string, unknown>;
    const type = obj.type as string;
    if (!VALID_PROPERTY_TYPES.includes(type as PropertyType)) {
      throw new Error(
        `Invalid type "${type}" for property "${name}" on page "${pageKey}". Must be: ${VALID_PROPERTY_TYPES.join(", ")}`
      );
    }
    if (obj.default == null) {
      throw new Error(
        `Missing default for property "${name}" on page "${pageKey}"`
      );
    }
    const expectedType = type === "boolean" ? "boolean" : type === "number" ? "number" : "string";
    if (typeof obj.default !== expectedType) {
      throw new Error(
        `Default value for "${name}" on page "${pageKey}" must be a ${type}`
      );
    }
    result[name] = { type: type as PropertyType, default: obj.default };
  }
  return result;
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
