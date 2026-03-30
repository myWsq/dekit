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
  baseDir: string; // absolute path to directory containing design.yaml
}
