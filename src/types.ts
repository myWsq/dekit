export interface ComponentDef {
  template: string;
  style: string;
}

export interface PageDef {
  template: string;
  style: string;
}

export interface DesignConfig {
  version: number;
  globalStyle: string;
  components: Record<string, ComponentDef>;
  pages: Record<string, PageDef>;
  baseDir: string; // absolute path to directory containing dekit.yaml
  workDir: string; // absolute path to working directory for generated files
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
