export interface NodeInfo {
  tagName: string;
  path: string;
  cssSelector: string;
  attributes: Record<string, string>;
  computedStyles: Record<string, string>;
  boundingRect: { x: number; y: number; width: number; height: number };
}

export interface DOMTreeNode {
  tagName: string;
  path: string;
  className: string;
  children: DOMTreeNode[];
}

export interface DeviceConfig {
  width: number;
  height: number;
  dpr: number;
  name?: string;
}

export interface PropertyDef {
  type: "boolean" | "number" | "string";
  default: unknown;
}

export interface EditorConfig {
  pages: string[];
  pagePaths: Record<string, string>;
  pageProperties: Record<string, Record<string, PropertyDef>>;
  components: string[];
  device: DeviceConfig | null;
  designServerUrl: string;
}

// Messages from iframe → editor
export type IframeMessage =
  | { type: "NODE_SELECTED"; node: NodeInfo }
  | { type: "NODE_HOVERED"; node: NodeInfo }
  | { type: "DOM_TREE"; tree: DOMTreeNode[] };

// Messages from editor → iframe
export type EditorMessage =
  | { type: "GET_DOM_TREE" }
  | { type: "HIGHLIGHT_NODE"; path: string }
  | { type: "HOVER_NODE"; path: string }
  | { type: "CLEAR_HIGHLIGHT" }
  | { type: "SET_TOUCH_CURSOR"; enabled: boolean }
  | { type: "SET_INSPECT_MODE"; enabled: boolean };

export interface DevicePreset {
  name: string;
  width: number;
  height: number;
  dpr: number;
}
