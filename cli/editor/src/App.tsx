import React, { useState, useEffect, useCallback, useRef } from "react";
import type { EditorConfig, NodeInfo, DOMTreeNode, IframeMessage } from "./types.js";
import { DEVICE_PRESETS, calcScale } from "./devices.js";
import type { DevicePreset } from "./types.js";

export function App() {
  const [config, setConfig] = useState<EditorConfig | null>(null);
  const [currentPage, setCurrentPage] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [domTree, setDomTree] = useState<DOMTreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch config
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: EditorConfig) => {
        setConfig(data);
        if (data.pages.length > 0) {
          setCurrentPage(data.pages[0]);
        }
      });
  }, []);

  // Listen for iframe messages
  useEffect(() => {
    function handleMessage(e: MessageEvent<IframeMessage>) {
      const msg = e.data;
      if (!msg || !msg.type) return;
      if (msg.type === "NODE_SELECTED") {
        setSelectedNode(msg.node);
        setSelectedPath(msg.node.path);
      } else if (msg.type === "DOM_TREE") {
        setDomTree(msg.tree);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Request DOM tree when page loads in iframe
  const handleIframeLoad = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "GET_DOM_TREE" }, "*");
  }, []);

  // Click on layer tree node
  const handleLayerClick = useCallback((path: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "HIGHLIGHT_NODE", path },
      "*"
    );
    setSelectedPath(path);
  }, []);

  if (!config) {
    return <div className="empty-state">Loading...</div>;
  }

  const iframeSrc = currentPage
    ? `${config.designServerUrl}/page/${currentPage}`
    : "";

  return (
    <div className="editor-layout">
      {/* Left Panel */}
      <div className="left-panel">
        <div className="panel-header">Pages</div>
        <ul className="page-list">
          {config.pages.map((page) => (
            <li
              key={page}
              className={`page-item ${page === currentPage ? "active" : ""}`}
              onClick={() => {
                setCurrentPage(page);
                setSelectedNode(null);
                setDomTree([]);
                setSelectedPath("");
              }}
            >
              {page}
            </li>
          ))}
        </ul>
        <div className="panel-header">Layers</div>
        <div className="layer-tree">
          {domTree.map((node) => (
            <LayerTreeNode
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              onSelect={handleLayerClick}
            />
          ))}
        </div>
      </div>

      {/* Center Panel */}
      <div className="center-panel">
        {iframeSrc ? (
          <iframe
            ref={iframeRef}
            className="canvas-iframe"
            src={iframeSrc}
            onLoad={handleIframeLoad}
          />
        ) : (
          <div className="empty-state">Select a page</div>
        )}
      </div>

      {/* Right Panel */}
      <div className="right-panel">
        <div className="panel-header">Properties</div>
        {selectedNode ? (
          <PropertyPanel node={selectedNode} />
        ) : (
          <div className="empty-state">Select an element to inspect</div>
        )}
      </div>
    </div>
  );
}

function DeviceToolbar({
  deviceMode,
  deviceWidth,
  deviceHeight,
  zoomMode,
  touchCursor,
  onDeviceChange,
  onWidthChange,
  onHeightChange,
  onRotate,
  onZoomChange,
  onTouchCursorToggle,
}: {
  deviceMode: string;
  deviceWidth: number;
  deviceHeight: number;
  zoomMode: "fit" | number;
  touchCursor: boolean;
  onDeviceChange: (mode: string) => void;
  onWidthChange: (w: number) => void;
  onHeightChange: (h: number) => void;
  onRotate: () => void;
  onZoomChange: (zoom: "fit" | number) => void;
  onTouchCursorToggle: () => void;
}) {
  const currentPreset = DEVICE_PRESETS.find((d) => d.name === deviceMode);
  const dpr = currentPreset?.dpr ?? 1;

  return (
    <div className="device-toolbar">
      <select
        value={
          deviceMode === "responsive"
            ? "responsive"
            : currentPreset
              ? deviceMode
              : "custom"
        }
        onChange={(e) => {
          const val = e.target.value;
          if (val === "responsive") {
            onDeviceChange("responsive");
            onWidthChange(0);
            onHeightChange(0);
          } else if (val === "custom") {
            onDeviceChange("custom");
          } else {
            const preset = DEVICE_PRESETS.find((d) => d.name === val);
            if (preset) {
              onDeviceChange(preset.name);
              onWidthChange(preset.width);
              onHeightChange(preset.height);
            }
          }
        }}
      >
        <option value="responsive">Responsive</option>
        {DEVICE_PRESETS.map((d) => (
          <option key={d.name} value={d.name}>
            {d.name} — {d.width}×{d.height}
          </option>
        ))}
        {deviceMode === "custom" && <option value="custom">Custom</option>}
      </select>

      <input
        className="dim-input"
        type="number"
        min={0}
        value={deviceWidth || ""}
        placeholder="W"
        onChange={(e) => {
          const w = parseInt(e.target.value) || 0;
          onWidthChange(w);
          if (deviceMode !== "responsive" && deviceMode !== "custom") {
            onDeviceChange("custom");
          }
        }}
      />
      <span className="dim-separator">×</span>
      <input
        className="dim-input"
        type="number"
        min={0}
        value={deviceHeight || ""}
        placeholder="H"
        onChange={(e) => {
          const h = parseInt(e.target.value) || 0;
          onHeightChange(h);
          if (deviceMode !== "responsive" && deviceMode !== "custom") {
            onDeviceChange("custom");
          }
        }}
      />

      <button
        className="toolbar-btn"
        title="Rotate"
        onClick={onRotate}
        disabled={!deviceWidth || !deviceHeight}
      >
        ↻
      </button>

      <select
        value={zoomMode}
        onChange={(e) => {
          const val = e.target.value;
          onZoomChange(val === "fit" ? "fit" : parseInt(val));
        }}
      >
        <option value="fit">Fit</option>
        <option value={50}>50%</option>
        <option value={75}>75%</option>
        <option value={100}>100%</option>
        <option value={125}>125%</option>
        <option value={150}>150%</option>
      </select>

      <span className="dpr-badge">DPR: {dpr}</span>

      <button
        className={`toolbar-btn ${touchCursor ? "active" : ""}`}
        title="Touch cursor"
        onClick={onTouchCursorToggle}
      >
        👆
      </button>
    </div>
  );
}

function LayerTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: DOMTreeNode;
  depth: number;
  selectedPath: string;
  onSelect: (path: string) => void;
}) {
  return (
    <>
      <div
        className={`layer-node ${node.path === selectedPath ? "selected" : ""}`}
        style={{ paddingLeft: 12 + depth * 16 }}
        onClick={() => onSelect(node.path)}
      >
        <span className="layer-tag">&lt;{node.tagName}&gt;</span>
        {node.className && (
          <span className="layer-class">.{node.className.split(" ")[0]}</span>
        )}
      </div>
      {node.children.map((child) => (
        <LayerTreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function PropertyPanel({ node }: { node: NodeInfo }) {
  const layoutStyles = ["width", "height", "display", "position",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "marginTop", "marginRight", "marginBottom", "marginLeft"];
  const visualStyles = ["backgroundColor", "color", "border",
    "borderRadius", "opacity"];
  const textStyles = ["fontFamily", "fontSize", "fontWeight", "lineHeight"];

  function renderStyleGroup(title: string, keys: string[]) {
    const entries = keys
      .map((k) => [k, node.computedStyles[k]])
      .filter(([, v]) => v && v !== "none" && v !== "normal" && v !== "0px");
    if (entries.length === 0) return null;
    return (
      <div className="property-section">
        <div className="property-section-title">{title}</div>
        {entries.map(([k, v]) => (
          <div key={k} className="property-row">
            <span className="property-key">{k}</span>
            <span className="property-value">{v}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="property-section">
        <div className="property-section-title">Element</div>
        <div className="property-row">
          <span className="property-key">Tag</span>
          <span className="property-value">&lt;{node.tagName}&gt;</span>
        </div>
        {Object.entries(node.attributes).map(([k, v]) => (
          <div key={k} className="property-row">
            <span className="property-key">{k}</span>
            <span className="property-value">{v}</span>
          </div>
        ))}
      </div>
      <div className="property-section">
        <div className="property-section-title">Size</div>
        <div className="property-row">
          <span className="property-key">width</span>
          <span className="property-value">{Math.round(node.boundingRect.width)}px</span>
        </div>
        <div className="property-row">
          <span className="property-key">height</span>
          <span className="property-value">{Math.round(node.boundingRect.height)}px</span>
        </div>
      </div>
      {renderStyleGroup("Layout", layoutStyles)}
      {renderStyleGroup("Visual", visualStyles)}
      {renderStyleGroup("Typography", textStyles)}
    </>
  );
}
