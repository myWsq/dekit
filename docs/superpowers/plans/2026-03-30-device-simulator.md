# Device Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Chrome DevTools-style device simulation to the Redesign editor, allowing users to preview designs at specific device dimensions with auto-scaling.

**Architecture:** The iframe is set to the device's exact pixel dimensions, then `transform: scale()` shrinks it to fit the available canvas area. A centered toolbar above the canvas provides device presets, custom dimensions, rotation, zoom control, DPR display, and touch cursor toggle.

**Tech Stack:** React 19, Vite, TypeScript, vitest, CSS

---

## File Structure

| File | Status | Responsibility |
|------|--------|---------------|
| `cli/editor/src/devices.ts` | Create | Device preset data + `calcScale()` pure function |
| `cli/editor/src/devices.test.ts` | Create | Tests for device presets and scale calculation |
| `cli/editor/src/types.ts` | Modify | Add `DevicePreset` interface, `SET_TOUCH_CURSOR` message type |
| `cli/editor/src/App.tsx` | Modify | `DeviceToolbar` component, iframe wrapper with transform, state management |
| `cli/editor/src/styles/editor.css` | Modify | Toolbar styles, grid background, iframe wrapper, touch cursor overlay |
| `cli/src/injected/inspector.ts` | Modify | Handle `SET_TOUCH_CURSOR` message |

---

### Task 1: Device Presets Data & Scale Calculation

**Files:**
- Create: `cli/editor/src/devices.ts`
- Create: `cli/editor/src/devices.test.ts`
- Modify: `cli/editor/src/types.ts`

- [ ] **Step 1: Add DevicePreset type to types.ts**

Add to the end of `cli/editor/src/types.ts`:

```typescript
export interface DevicePreset {
  name: string;
  width: number;
  height: number;
  dpr: number;
}
```

- [ ] **Step 2: Write failing tests for devices module**

Create `cli/editor/src/devices.test.ts`:

```typescript
import { describe, test, expect } from "vitest";
import { DEVICE_PRESETS, calcScale } from "./devices.js";

describe("DEVICE_PRESETS", () => {
  test("has at least 10 presets", () => {
    expect(DEVICE_PRESETS.length).toBeGreaterThanOrEqual(10);
  });

  test("every preset has valid dimensions", () => {
    for (const d of DEVICE_PRESETS) {
      expect(d.name).toBeTruthy();
      expect(d.width).toBeGreaterThan(0);
      expect(d.height).toBeGreaterThan(0);
      expect(d.dpr).toBeGreaterThan(0);
    }
  });

  test("first preset is a phone", () => {
    expect(DEVICE_PRESETS[0].width).toBeLessThan(500);
  });
});

describe("calcScale", () => {
  test("fits a phone into a large canvas", () => {
    const scale = calcScale(393, 852, 800, 600);
    // 800/393 = 2.03, 600/852 = 0.70 → min is 0.70, clamped to ≤1
    expect(scale).toBeCloseTo(0.704, 2);
  });

  test("never scales above 1", () => {
    const scale = calcScale(200, 200, 800, 600);
    expect(scale).toBe(1);
  });

  test("handles equal dimensions", () => {
    const scale = calcScale(800, 600, 800, 600);
    expect(scale).toBe(1);
  });

  test("handles device wider than canvas", () => {
    const scale = calcScale(1920, 1080, 800, 600);
    // 800/1920 = 0.417, 600/1080 = 0.556 → min is 0.417
    expect(scale).toBeCloseTo(0.417, 2);
  });

  test("clamps to minimum 0.1", () => {
    const scale = calcScale(10000, 10000, 100, 100);
    expect(scale).toBe(0.1);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /Users/bytedance/t/redesign/cli && npx vitest run editor/src/devices.test.ts`
Expected: FAIL — module `./devices.js` not found

- [ ] **Step 4: Implement devices module**

Create `cli/editor/src/devices.ts`:

```typescript
import type { DevicePreset } from "./types.js";

export const DEVICE_PRESETS: DevicePreset[] = [
  { name: "iPhone SE", width: 375, height: 667, dpr: 2 },
  { name: "iPhone 14", width: 390, height: 844, dpr: 3 },
  { name: "iPhone 14 Pro", width: 393, height: 852, dpr: 3 },
  { name: "iPhone 14 Pro Max", width: 430, height: 932, dpr: 3 },
  { name: "iPhone 16", width: 393, height: 852, dpr: 3 },
  { name: "iPhone 16 Pro Max", width: 440, height: 956, dpr: 3 },
  { name: "iPad Mini", width: 744, height: 1133, dpr: 2 },
  { name: "iPad Air", width: 820, height: 1180, dpr: 2 },
  { name: "iPad Pro 12.9\"", width: 1024, height: 1366, dpr: 2 },
  { name: "Samsung Galaxy S24", width: 360, height: 780, dpr: 3 },
  { name: "Pixel 8", width: 412, height: 915, dpr: 2.625 },
  { name: "Desktop 1280", width: 1280, height: 800, dpr: 1 },
  { name: "Desktop 1440", width: 1440, height: 900, dpr: 1 },
  { name: "Desktop 1920", width: 1920, height: 1080, dpr: 1 },
];

/**
 * Calculate the scale factor to fit device dimensions into available space.
 * Returns a value between 0.1 and 1.
 */
export function calcScale(
  deviceWidth: number,
  deviceHeight: number,
  availableWidth: number,
  availableHeight: number
): number {
  const scaleX = availableWidth / deviceWidth;
  const scaleY = availableHeight / deviceHeight;
  return Math.max(0.1, Math.min(scaleX, scaleY, 1));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/bytedance/t/redesign/cli && npx vitest run editor/src/devices.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 6: Commit**

```bash
git add cli/editor/src/types.ts cli/editor/src/devices.ts cli/editor/src/devices.test.ts
git commit -m "feat: add device presets and scale calculation"
```

---

### Task 2: CSS — Toolbar, Grid Background, Iframe Wrapper

**Files:**
- Modify: `cli/editor/src/styles/editor.css`

- [ ] **Step 1: Add device toolbar styles**

Append to the end of `cli/editor/src/styles/editor.css`:

```css
/* Device Toolbar */
.device-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 6px 12px;
  background: #2d2d30;
  border-bottom: 1px solid #3c3c3c;
  font-size: 12px;
  color: #cccccc;
  user-select: none;
  flex-shrink: 0;
}

.device-toolbar select {
  background: #3c3c3c;
  border: 1px solid #555;
  color: #cccccc;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  outline: none;
}

.device-toolbar select:focus {
  border-color: #2563eb;
}

.device-toolbar .dim-input {
  width: 52px;
  background: #3c3c3c;
  border: 1px solid #555;
  color: #cccccc;
  padding: 2px 4px;
  border-radius: 3px;
  text-align: center;
  font-size: 11px;
  outline: none;
}

.device-toolbar .dim-input:focus {
  border-color: #2563eb;
}

.device-toolbar .dim-separator {
  color: #666;
}

.device-toolbar .toolbar-btn {
  background: none;
  border: 1px solid #555;
  color: #cccccc;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
}

.device-toolbar .toolbar-btn:hover {
  background: #3c3c3c;
}

.device-toolbar .toolbar-btn.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.device-toolbar .dpr-badge {
  font-size: 11px;
  color: #969696;
  border: 1px solid #555;
  padding: 1px 6px;
  border-radius: 3px;
}
```

- [ ] **Step 2: Add canvas area and iframe wrapper styles**

Continue appending to `cli/editor/src/styles/editor.css`:

```css
/* Canvas area with grid background */
.center-panel.device-active {
  padding: 0;
  flex-direction: column;
}

.canvas-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  position: relative;
}

.canvas-area.with-grid {
  background: repeating-conic-gradient(#1a1a1a 0% 25%, #1e1e1e 0% 50%) 0 0 / 16px 16px;
}

/* Iframe wrapper for transform scaling */
.iframe-wrapper {
  flex-shrink: 0;
}

.iframe-wrapper .canvas-iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.4);
}

/* Touch cursor overlay */
.touch-cursor-overlay {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.3);
  border: 2px solid rgba(37, 99, 235, 0.6);
  pointer-events: none;
  transform: translate(-50%, -50%);
  display: none;
  z-index: 10;
}

.canvas-area.touch-active .touch-cursor-overlay {
  display: block;
}

.canvas-area.touch-active .iframe-wrapper {
  cursor: none;
}
```

- [ ] **Step 3: Update existing center-panel and canvas-iframe rules**

Replace the existing `.center-panel` rule in the CSS:

```css
.center-panel {
  flex: 1;
  background: #1e1e1e;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  min-width: 0;
}
```

Replace the existing `.canvas-iframe` rule:

```css
.canvas-iframe {
  width: 100%;
  height: 100%;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  background: #ffffff;
}
```

- [ ] **Step 4: Commit**

```bash
git add cli/editor/src/styles/editor.css
git commit -m "feat: add device simulator CSS styles"
```

---

### Task 3: Inspector — Touch Cursor Message Handler

**Files:**
- Modify: `cli/editor/src/types.ts`
- Modify: `cli/src/injected/inspector.ts`

- [ ] **Step 1: Add SET_TOUCH_CURSOR to EditorMessage type**

In `cli/editor/src/types.ts`, replace the `EditorMessage` type:

```typescript
export type EditorMessage =
  | { type: "GET_DOM_TREE" }
  | { type: "HIGHLIGHT_NODE"; path: string }
  | { type: "CLEAR_HIGHLIGHT" }
  | { type: "SET_TOUCH_CURSOR"; enabled: boolean };
```

- [ ] **Step 2: Add SET_TOUCH_CURSOR handler in inspector.ts**

In `cli/src/injected/inspector.ts`, inside the `window.addEventListener('message', ...)` handler, add a new `else if` block after the `CLEAR_HIGHLIGHT` handler (before the closing `});`):

```javascript
    } else if (msg.type === 'SET_TOUCH_CURSOR') {
      let touchStyle = document.getElementById('__redesign_touch_cursor__');
      if (msg.enabled) {
        if (!touchStyle) {
          touchStyle = document.createElement('style');
          touchStyle.id = '__redesign_touch_cursor__';
          touchStyle.textContent = '* { cursor: none !important; }';
          document.head.appendChild(touchStyle);
        }
      } else {
        if (touchStyle) touchStyle.remove();
      }
    }
```

This goes right after the existing line:

```javascript
    } else if (msg.type === 'CLEAR_HIGHLIGHT') {
      hideOverlay();
    }
```

So the full block becomes:

```javascript
    } else if (msg.type === 'CLEAR_HIGHLIGHT') {
      hideOverlay();
    } else if (msg.type === 'SET_TOUCH_CURSOR') {
      let touchStyle = document.getElementById('__redesign_touch_cursor__');
      if (msg.enabled) {
        if (!touchStyle) {
          touchStyle = document.createElement('style');
          touchStyle.id = '__redesign_touch_cursor__';
          touchStyle.textContent = '* { cursor: none !important; }';
          document.head.appendChild(touchStyle);
        }
      } else {
        if (touchStyle) touchStyle.remove();
      }
    }
```

- [ ] **Step 3: Commit**

```bash
git add cli/editor/src/types.ts cli/src/injected/inspector.ts
git commit -m "feat: add SET_TOUCH_CURSOR message handler to inspector"
```

---

### Task 4: DeviceToolbar Component

**Files:**
- Modify: `cli/editor/src/App.tsx`

This task adds the `DeviceToolbar` component as a standalone function inside `App.tsx`. It does NOT yet wire it into the layout — that happens in Task 5.

- [ ] **Step 1: Add DeviceToolbar component to App.tsx**

Add this import at the top of `App.tsx`, after the existing import lines:

```typescript
import { DEVICE_PRESETS, calcScale } from "./devices.js";
import type { DevicePreset } from "./types.js";
```

Add this component function before the `LayerTreeNode` function (around line 123):

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add cli/editor/src/App.tsx
git commit -m "feat: add DeviceToolbar component"
```

---

### Task 5: Wire Everything Together in App

**Files:**
- Modify: `cli/editor/src/App.tsx`

This task adds device simulator state, wires `DeviceToolbar` into the layout, wraps the iframe with transform scaling, and adds the touch cursor overlay.

- [ ] **Step 1: Add device state to App component**

In the `App` function, after the existing `iframeRef` line (line 10), add:

```typescript
  const [deviceMode, setDeviceMode] = useState("responsive");
  const [deviceWidth, setDeviceWidth] = useState(0);
  const [deviceHeight, setDeviceHeight] = useState(0);
  const [zoomMode, setZoomMode] = useState<"fit" | number>("fit");
  const [touchCursor, setTouchCursor] = useState(false);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const touchOverlayRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
```

- [ ] **Step 2: Add ResizeObserver for canvas area**

After the existing `handleIframeLoad` callback (around line 43), add:

```typescript
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
  }, []);

  // Send touch cursor state to iframe
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "SET_TOUCH_CURSOR", enabled: touchCursor },
      "*"
    );
  }, [touchCursor]);

  // Touch cursor overlay follows mouse
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!touchCursor || !touchOverlayRef.current) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      touchOverlayRef.current.style.left = `${e.clientX - rect.left}px`;
      touchOverlayRef.current.style.top = `${e.clientY - rect.top}px`;
    },
    [touchCursor]
  );

  const handleRotate = useCallback(() => {
    setDeviceWidth((prev) => {
      const oldHeight = deviceHeight;
      setDeviceHeight(prev);
      return oldHeight;
    });
  }, [deviceHeight]);
```

- [ ] **Step 3: Add scale calculation logic**

After the `handleRotate` callback, add:

```typescript
  // Calculate scale and iframe dimensions
  const isDeviceActive = deviceWidth > 0 && deviceHeight > 0;
  const padding = 24;

  let scaleFactor = 1;
  if (isDeviceActive && canvasSize.width > 0 && canvasSize.height > 0) {
    if (zoomMode === "fit") {
      scaleFactor = calcScale(
        deviceWidth,
        deviceHeight,
        canvasSize.width - padding * 2,
        canvasSize.height - padding * 2
      );
    } else {
      scaleFactor = Math.max(0.1, zoomMode / 100);
    }
  }
```

- [ ] **Step 4: Replace the center panel JSX**

Replace the entire `{/* Center Panel */}` section (lines 97-109):

```typescript
      {/* Center Panel */}
      <div className={`center-panel ${isDeviceActive ? "device-active" : ""}`}>
        <DeviceToolbar
          deviceMode={deviceMode}
          deviceWidth={deviceWidth}
          deviceHeight={deviceHeight}
          zoomMode={zoomMode}
          touchCursor={touchCursor}
          onDeviceChange={setDeviceMode}
          onWidthChange={setDeviceWidth}
          onHeightChange={setDeviceHeight}
          onRotate={handleRotate}
          onZoomChange={setZoomMode}
          onTouchCursorToggle={() => setTouchCursor((prev) => !prev)}
        />
        <div
          ref={canvasAreaRef}
          className={`canvas-area ${isDeviceActive ? "with-grid" : ""} ${touchCursor ? "touch-active" : ""}`}
          onMouseMove={handleCanvasMouseMove}
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
              <iframe
                ref={iframeRef}
                className="canvas-iframe"
                src={iframeSrc}
                onLoad={handleIframeLoad}
                style={{ width: "100%", height: "100%", border: "1px solid #3c3c3c" }}
              />
            )
          ) : (
            <div className="empty-state">Select a page</div>
          )}
          <div ref={touchOverlayRef} className="touch-cursor-overlay" />
        </div>
      </div>
```

- [ ] **Step 5: Run the editor to verify it works**

Run: `cd /Users/bytedance/t/redesign/cli && npx vite build --config editor/vite.config.ts`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add cli/editor/src/App.tsx
git commit -m "feat: wire device simulator into editor layout"
```

---

### Task 6: Run All Tests & Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `cd /Users/bytedance/t/redesign/cli && npx vitest run`
Expected: All tests pass, including existing parser and vite-plugin tests

- [ ] **Step 2: Build the editor**

Run: `cd /Users/bytedance/t/redesign/cli && npx vite build --config editor/vite.config.ts`
Expected: Build succeeds

- [ ] **Step 3: Start the full editor and manually verify**

Run: `cd /Users/bytedance/t/redesign && npx tsx cli/bin/redesign.ts design`

Manual checks:
1. Toolbar appears at top of center panel with "Responsive" selected
2. Selecting "iPhone 14 Pro" sets iframe to 393×852 with grid background
3. Width/height inputs update when selecting a preset
4. Typing custom dimensions switches dropdown to "Custom"
5. Rotate button swaps width ↔ height
6. Zoom "Fit" auto-scales iframe to fit canvas
7. Zoom "100%" shows iframe at real size (may overflow)
8. DPR badge shows correct value for each preset
9. Touch cursor toggle shows circle overlay and hides real cursor
10. Switching pages preserves device settings
11. Selecting "Responsive" with 0×0 returns to original full-width behavior
