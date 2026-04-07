export interface ComponentDef {
  template: string;
  style: string;
}

export type PropertyType = "boolean" | "number" | "string";

export interface PropertyDef {
  type: PropertyType;
  default: unknown;
}

export interface PageDef {
  template: string;
  style: string;
  properties?: Record<string, PropertyDef>;
}

export interface DeviceConfig {
  width: number;
  height: number;
  dpr: number;
  name?: string;
}

export interface DesignConfig {
  version: number;
  globalStyle: string;
  device?: DeviceConfig;
  components: Record<string, ComponentDef>;
  pages: Record<string, PageDef>;
  baseDir: string; // absolute path to .dekit/ directory (where dekit.yaml lives)
}

export interface PageRef {
  type: "page";
  pageKey: string;
}

export interface ElementRef {
  type: "element";
  pageKey: string;
  selector: string;
}

export type DekitRef = PageRef | ElementRef;
