import React, { useState, useEffect, useCallback, useRef } from "react";
import type { EditorConfig, NodeInfo, DOMTreeNode, IframeMessage } from "./types.js";
import { DEVICE_PRESETS, calcScale } from "./devices.js";
import type { DevicePreset } from "./types.js";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { MdScreenRotation, MdClose } from "react-icons/md";
import { TbMarquee } from "react-icons/tb";

function flattenDomTree(nodes: DOMTreeNode[]): string[] {
  const result: string[] = [];
  for (const node of nodes) {
    result.push(node.path);
    result.push(...flattenDomTree(node.children));
  }
  return result;
}

export function App() {
  const [config, setConfig] = useState<EditorConfig | null>(null);
  const [currentPage, setCurrentPage] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [domTree, setDomTree] = useState<DOMTreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [deviceMode, setDeviceMode] = useState("responsive");
  const [deviceWidth, setDeviceWidth] = useState(0);
  const [deviceHeight, setDeviceHeight] = useState(0);
  const [zoomMode, setZoomMode] = useState<"fit" | number>("fit");
  const [inspectMode, setInspectMode] = useState(false);
  const [inspectLocked, setInspectLocked] = useState(false);
  const inspectModeRef = useRef(false);
  const altPressedRef = useRef(false);
  const currentPageRef = useRef("");
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; cssSelector?: string; page: string } | null>(null);
  const [focusedPanel, setFocusedPanel] = useState<"pages" | "layers" | null>(null);

  const configRef = useRef<EditorConfig | null>(null);
  configRef.current = config;

  const getPageRef = useCallback((page: string) => {
    return "$$" + "{" + page + "}";
  }, []);

  const getNodeRef = useCallback((page: string, cssSelector: string) => {
    return "$$" + "{" + page + "@" + cssSelector + "}";
  }, []);

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
    function handleMessage(e: MessageEvent) {
      const msg = e.data;
      if (!msg || !msg.type) return;
      if (msg.type === "NODE_SELECTED") {
        setSelectedNode(msg.node);
        setSelectedPath(msg.node.path);
      } else if (msg.type === "CONTEXT_MENU") {
        setSelectedNode(msg.node);
        setSelectedPath(msg.node.path);
        // Convert iframe-local coordinates to editor coordinates
        const iframe = iframeRef.current;
        if (iframe) {
          const iframeRect = iframe.getBoundingClientRect();
          const sf = scaleFactor;
          setContextMenu({
            x: iframeRect.left + msg.x * sf,
            y: iframeRect.top + msg.y * sf,
            cssSelector: msg.node.cssSelector,
            page: currentPageRef.current,
          });
        }
      } else if (msg.type === "DISMISS_CONTEXT_MENU") {
        setContextMenu(null);
      } else if (msg.type === "DOM_TREE") {
        setDomTree(msg.tree);
      } else if (msg.type === "INSPECT_KEY") {
        if (msg.pressed) {
          altPressedRef.current = true;
          setInspectMode(true);
        } else {
          altPressedRef.current = false;
          setInspectMode(inspectLocked);
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [inspectLocked]);

  // Request DOM tree when page loads in iframe
  const handleIframeLoad = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "GET_DOM_TREE" }, "*");
    iframeRef.current?.contentWindow?.postMessage({ type: "SET_INSPECT_MODE", enabled: inspectMode }, "*");
    iframeRef.current?.contentWindow?.postMessage({ type: "SET_PAGE_NAME", page: currentPage }, "*");
  }, [inspectMode, currentPage]);

  // Click on layer tree node
  const handleLayerClick = useCallback((path: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "HIGHLIGHT_NODE", path },
      "*"
    );
    setSelectedPath(path);
  }, []);

  // Hover on layer tree node
  const handleLayerHover = useCallback((path: string | null) => {
    if (path) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "HOVER_NODE", path },
        "*"
      );
    } else {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "CLEAR_HIGHLIGHT" },
        "*"
      );
    }
  }, []);

  // Track canvas area size for auto-fit calculation
  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [config]);

  // In responsive mode, sync device size to canvas size
  useEffect(() => {
    if (deviceMode === "responsive" && canvasSize.width > 0 && canvasSize.height > 0) {
      setDeviceWidth(Math.round(canvasSize.width));
      setDeviceHeight(Math.round(canvasSize.height));
    }
  }, [deviceMode, canvasSize]);

  // Sync inspect mode to iframe
  useEffect(() => {
    inspectModeRef.current = inspectMode;
    iframeRef.current?.contentWindow?.postMessage(
      { type: "SET_INSPECT_MODE", enabled: inspectMode },
      "*"
    );
  }, [inspectMode]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Dismiss context menu on click, freeze iframe while open
  useEffect(() => {
    if (!contextMenu) return;
    const iframeWin = iframeRef.current?.contentWindow;
    iframeWin?.postMessage({ type: "SET_SCROLL_LOCK", enabled: true }, "*");
    iframeWin?.postMessage({ type: "SET_FROZEN", enabled: true }, "*");
    function dismiss() { setContextMenu(null); }
    window.addEventListener("click", dismiss);
    return () => {
      window.removeEventListener("click", dismiss);
      iframeWin?.postMessage({ type: "SET_SCROLL_LOCK", enabled: false }, "*");
      iframeWin?.postMessage({ type: "SET_FROZEN", enabled: false }, "*");
    };
  }, [contextMenu]);

  // Hold Alt to temporarily enable inspect mode
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Alt") {
        altPressedRef.current = true;
        setInspectMode(true);
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === "Alt") {
        altPressedRef.current = false;
        setInspectMode(inspectLocked);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [inspectLocked]);

  const handleRotate = useCallback(() => {
    const w = deviceWidth;
    const h = deviceHeight;
    setDeviceWidth(h);
    setDeviceHeight(w);
  }, [deviceWidth, deviceHeight]);

  // Calculate scale and iframe dimensions
  const isDeviceActive = deviceWidth > 0 && deviceHeight > 0;

  let scaleFactor = 1;
  if (isDeviceActive && canvasSize.width > 0 && canvasSize.height > 0) {
    if (zoomMode === "fit") {
      scaleFactor = calcScale(
        deviceWidth,
        deviceHeight,
        canvasSize.width,
        canvasSize.height
      );
    } else {
      scaleFactor = Math.max(0.1, zoomMode / 100);
    }
  }
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
        <OverlayScrollbarsComponent className="page-list-scroll" defer>
          <ul
            className={`page-list ${focusedPanel === "pages" ? "focused" : ""}`}
            tabIndex={0}
            onFocus={() => setFocusedPanel("pages")}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setFocusedPanel((prev) => prev === "pages" ? null : prev);
              }
            }}
            onKeyDown={(e) => {
              if (focusedPanel !== "pages") return;
              const pages = config.pages;
              const idx = pages.indexOf(currentPage);
              if (e.key === "ArrowUp" && idx > 0) {
                e.preventDefault();
                const page = pages[idx - 1];
                setCurrentPage(page);
                setSelectedNode(null);
                setDomTree([]);
                setSelectedPath("");
              } else if (e.key === "ArrowDown" && idx < pages.length - 1) {
                e.preventDefault();
                const page = pages[idx + 1];
                setCurrentPage(page);
                setSelectedNode(null);
                setDomTree([]);
                setSelectedPath("");
              }
            }}
          >
            {config.pages.map((page) => (
              <li
                key={page}
                className={`page-item ${page === currentPage ? "active" : ""}`}
                onClick={() => {
                  if (page !== currentPage) {
                    setCurrentPage(page);
                    setSelectedNode(null);
                    setDomTree([]);
                    setSelectedPath("");
                  }
                  setFocusedPanel("pages");
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, page });
                }}
              >
                {page}
              </li>
            ))}
          </ul>
        </OverlayScrollbarsComponent>
      </div>

      {/* Center Panel */}
      <div className="center-panel">
        <DeviceToolbar
          deviceMode={deviceMode}
          deviceWidth={deviceWidth}
          deviceHeight={deviceHeight}
          zoomMode={zoomMode}
          inspectMode={inspectMode}
          onDeviceChange={setDeviceMode}
          onWidthChange={setDeviceWidth}
          onHeightChange={setDeviceHeight}
          onRotate={handleRotate}
          onZoomChange={setZoomMode}
          onInspectToggle={() => {
            const next = !inspectLocked;
            setInspectLocked(next);
            setInspectMode(next);
          }}
        />
        <div
          ref={canvasAreaRef}
          className="canvas-area with-grid"
        >
          {iframeSrc ? (
            isDeviceActive ? (
              <div
                className="iframe-wrapper"
                style={{
                  width: deviceWidth * scaleFactor,
                  height: deviceHeight * scaleFactor,
                }}
              >
                <iframe
                  ref={iframeRef}
                  className="canvas-iframe"
                  src={iframeSrc}
                  onLoad={handleIframeLoad}
                  style={{
                    width: deviceWidth,
                    height: deviceHeight,
                    transform: `scale(${scaleFactor})`,
                    transformOrigin: "top left",
                  }}
                />
              </div>
            ) : (
              <div className="empty-state">Select a page</div>
            )
          ) : (
            <div className="empty-state">Select a page</div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="right-panel">
        <div className="right-panel-top">
          <div className="panel-header">Layers</div>
          <OverlayScrollbarsComponent className="layer-tree-scroll" defer>
            <div
              className={`layer-tree ${focusedPanel === "layers" ? "focused" : ""}`}
              tabIndex={0}
              onFocus={() => setFocusedPanel("layers")}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setFocusedPanel((prev) => prev === "layers" ? null : prev);
                }
              }}
              onKeyDown={(e) => {
                if (focusedPanel !== "layers") return;
                const paths = flattenDomTree(domTree);
                const idx = paths.indexOf(selectedPath);
                if (e.key === "ArrowUp" && idx > 0) {
                  e.preventDefault();
                  handleLayerClick(paths[idx - 1]);
                } else if (e.key === "ArrowDown" && idx < paths.length - 1) {
                  e.preventDefault();
                  handleLayerClick(paths[idx + 1]);
                }
              }}
              onClick={() => setFocusedPanel("layers")}
            >
              {domTree.map((node) => (
                <LayerTreeNode
                  key={node.path}
                  node={node}
                  depth={0}
                  selectedPath={selectedPath}
                  onSelect={(path) => {
                    handleLayerClick(path);
                    setFocusedPanel("layers");
                  }}
                  onHover={handleLayerHover}
                  onContextMenu={(cssSelector, x, y) => setContextMenu({ x, y, cssSelector, page: currentPage })}
                />
              ))}
            </div>
          </OverlayScrollbarsComponent>
        </div>
        <div className="right-panel-bottom">
          <div className="panel-header">Properties</div>
          <OverlayScrollbarsComponent className="properties-scroll" defer>
            {selectedNode ? (
              <PropertyPanel node={selectedNode} nodeRef={getNodeRef(currentPage, selectedNode.cssSelector)} />
            ) : (
              <div className="empty-state">Select an element to inspect</div>
            )}
          </OverlayScrollbarsComponent>
        </div>
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.cssSelector && (
            <div
              className="context-menu-item"
              onClick={() => {
                navigator.clipboard.writeText(getNodeRef(contextMenu.page, contextMenu.cssSelector!));
                setContextMenu(null);
              }}
            >
              Copy Ref
            </div>
          )}
          <div
            className="context-menu-item"
            onClick={() => {
              navigator.clipboard.writeText(getPageRef(contextMenu.page));
              setContextMenu(null);
            }}
          >
            Copy Page Ref
          </div>
        </div>
      )}
    </div>
  );
}

function DeviceToolbar({
  deviceMode,
  deviceWidth,
  deviceHeight,
  zoomMode,
  inspectMode,
  onDeviceChange,
  onWidthChange,
  onHeightChange,
  onRotate,
  onZoomChange,
  onInspectToggle,
}: {
  deviceMode: string;
  deviceWidth: number;
  deviceHeight: number;
  zoomMode: "fit" | number;
  inspectMode: boolean;
  onDeviceChange: (mode: string) => void;
  onWidthChange: (w: number) => void;
  onHeightChange: (h: number) => void;
  onRotate: () => void;
  onZoomChange: (zoom: "fit" | number) => void;
  onInspectToggle: () => void;
}) {
  const currentPreset = DEVICE_PRESETS.find((d) => d.name === deviceMode);
  const isPreset = !!currentPreset;
  const dpr = currentPreset?.dpr ?? 1;

  const [draftWidth, setDraftWidth] = useState(String(deviceWidth || ""));
  const [draftHeight, setDraftHeight] = useState(String(deviceHeight || ""));

  // Sync drafts when external props change (e.g. device preset selection)
  useEffect(() => {
    setDraftWidth(String(deviceWidth || ""));
  }, [deviceWidth]);
  useEffect(() => {
    setDraftHeight(String(deviceHeight || ""));
  }, [deviceHeight]);

  let selectLabel = "Responsive";
  if (currentPreset) {
    selectLabel = `${currentPreset.name} — ${currentPreset.width}×${currentPreset.height}`;
  } else if (deviceMode === "custom") {
    selectLabel = "Custom";
  }

  return (
    <div className="device-toolbar">
      <select
        style={{ width: selectLabel.length + 4 + "ch" }}
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
        value={draftWidth}
        placeholder="W"
        disabled={isPreset}
        style={{ width: Math.max(3, draftWidth.length) + 1 + "ch" }}
        onChange={(e) => setDraftWidth(e.target.value)}
        onBlur={() => {
          const w = parseInt(draftWidth) || 0;
          onWidthChange(w);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      <MdClose className="dim-separator" size={12} />
      <input
        className="dim-input"
        type="number"
        min={0}
        value={draftHeight}
        placeholder="H"
        disabled={isPreset}
        style={{ width: Math.max(3, draftHeight.length) + 1 + "ch" }}
        onChange={(e) => setDraftHeight(e.target.value)}
        onBlur={() => {
          const h = parseInt(draftHeight) || 0;
          onHeightChange(h);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />

      <span className="toolbar-divider" />

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

      <span className="toolbar-divider" />

      <button
        className="toolbar-btn"
        title="Rotate"
        onClick={onRotate}
        disabled={!deviceWidth || !deviceHeight}
      >
        <MdScreenRotation size={14} />
      </button>

      <button
        className={`toolbar-btn ${inspectMode ? "active" : ""}`}
        title="Inspect element (hold Alt)"
        onClick={onInspectToggle}
      >
        <TbMarquee size={16} />
      </button>
    </div>
  );
}

function LayerTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
  onHover,
  onContextMenu,
}: {
  node: DOMTreeNode;
  depth: number;
  selectedPath: string;
  onSelect: (path: string) => void;
  onHover: (path: string | null) => void;
  onContextMenu: (path: string, x: number, y: number) => void;
}) {
  const isSelected = node.path === selectedPath;
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (el && isSelected) {
        el.scrollIntoView({ block: "nearest" });
      }
    },
    [isSelected]
  );
  return (
    <>
      <div
        ref={ref}
        className={`layer-node ${isSelected ? "selected" : ""}`}
        style={{ paddingLeft: 12 + depth * 16 }}
        onClick={() => onSelect(node.path)}
        onMouseEnter={() => onHover(node.path)}
        onMouseLeave={() => onHover(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(node.path, e.clientX, e.clientY);
        }}
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
          onHover={onHover}
          onContextMenu={onContextMenu}
        />
      ))}
    </>
  );
}

function truncateMiddle(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const ellipsis = "...";
  const keepStart = Math.ceil((maxLen - ellipsis.length) / 2);
  const keepEnd = Math.floor((maxLen - ellipsis.length) / 2);
  return str.slice(0, keepStart) + ellipsis + str.slice(str.length - keepEnd);
}

function toKebabCase(str: string): string {
  return str.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

function PropertyPanel({ node, nodeRef }: { node: NodeInfo; nodeRef: string }) {
  const displayRef = truncateMiddle(nodeRef, 30);
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
            <span className="property-key">{toKebabCase(k)}</span>
            <span className="property-value copyable" onClick={() => navigator.clipboard.writeText(v)} title={v}>{v}</span>
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
          <span className="property-key">Ref</span>
          <span className="property-value node-ref" onClick={() => navigator.clipboard.writeText(nodeRef)} title={nodeRef}>{displayRef}</span>
        </div>
        <div className="property-row">
          <span className="property-key">Tag</span>
          <span className="property-value copyable" onClick={() => navigator.clipboard.writeText(node.tagName)} title={node.tagName}>&lt;{node.tagName}&gt;</span>
        </div>
        {Object.entries(node.attributes).map(([k, v]) => (
          <div key={k} className="property-row">
            <span className="property-key">{k}</span>
            <span className="property-value copyable" onClick={() => navigator.clipboard.writeText(v)} title={v}>{v}</span>
          </div>
        ))}
      </div>
      <div className="property-section">
        <div className="property-section-title">Size</div>
        <div className="property-row">
          <span className="property-key">width</span>
          <span className="property-value copyable" onClick={() => navigator.clipboard.writeText(`${Math.round(node.boundingRect.width)}px`)}>{Math.round(node.boundingRect.width)}px</span>
        </div>
        <div className="property-row">
          <span className="property-key">height</span>
          <span className="property-value copyable" onClick={() => navigator.clipboard.writeText(`${Math.round(node.boundingRect.height)}px`)}>{Math.round(node.boundingRect.height)}px</span>
        </div>
      </div>
      {renderStyleGroup("Layout", layoutStyles)}
      {renderStyleGroup("Visual", visualStyles)}
      {renderStyleGroup("Typography", textStyles)}
    </>
  );
}
