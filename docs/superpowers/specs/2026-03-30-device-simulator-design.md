# Device Simulator for Redesign Editor

## Overview

Add a Chrome DevTools-style device simulation mode to the editor's center panel. When active, the iframe is resized to the exact device dimensions and scaled (via CSS `transform: scale()`) to fit the available canvas space. A centered toolbar above the iframe provides device selection, custom dimensions, rotation, zoom, DPR display, and touch cursor simulation.

## Architecture

### Approach: CSS Transform Scale

The iframe element is set to the device's exact pixel dimensions (e.g. 393×852 for iPhone 14 Pro). A `transform: scale(factor)` is applied to fit it within the available canvas area. This ensures CSS media queries fire at the correct breakpoints, matching real device behavior. This is the same technique Chrome DevTools uses.

**Scale calculation:**
```
availableWidth = centerPanel.width - padding * 2
availableHeight = centerPanel.height - toolbarHeight - padding * 2
scaleX = availableWidth / deviceWidth
scaleY = availableHeight / deviceHeight
autoScale = Math.min(scaleX, scaleY, 1)  // never scale up beyond 100%
```

### Component Structure

```
center-panel
├── device-toolbar          (new)
│   ├── device-select       (dropdown)
│   ├── width-input × height-input
│   ├── rotate-button
│   ├── zoom-select
│   ├── dpr-badge
│   └── touch-cursor-toggle
└── canvas-area
    └── iframe-wrapper      (new, handles transform)
        └── iframe
```

## Toolbar Design

The toolbar sits at the top of the center panel, all controls centered horizontally. It is always visible. The default state is "Responsive" with width/height 0, which behaves identically to the current editor (iframe fills available space, no transform scaling, no grid background).

### Controls (left to right, centered)

| Control | Behavior |
|---------|----------|
| **Device dropdown** | First option is "Responsive" (free-resize, current behavior). Other options are device presets. Selecting a preset fills width/height/DPR from the preset. |
| **Width × Height inputs** | Editable number inputs. Typing a custom value switches device dropdown to "Custom". |
| **Rotate button** | Swaps width ↔ height values. |
| **Zoom selector** | Options: "Fit" (auto-calculate scale), 50%, 75%, 100%, 125%, 150%. Default: "Fit". |
| **DPR badge** | Read-only display of device pixel ratio from the current preset. Shows "DPR: 1" for custom/responsive. |
| **Touch cursor toggle** | When enabled, injects `cursor: default` override into iframe and shows a circle cursor overlay on hover to simulate touch interaction. |

### Responsive Mode

When "Responsive" is selected with width/height at 0, the iframe fills the available canvas space with no transform scaling and no grid background — identical to the current editor behavior. If the user types specific dimensions into the width/height inputs while in Responsive mode, the grid background appears and the iframe switches to transform-scale mode at those dimensions.

## Device Presets

```typescript
interface DevicePreset {
  name: string;
  width: number;
  height: number;
  dpr: number;
  ua?: string;  // reserved for future use
}
```

Initial preset list:

| Name | Width | Height | DPR |
|------|-------|--------|-----|
| iPhone SE | 375 | 667 | 2 |
| iPhone 14 | 390 | 844 | 3 |
| iPhone 14 Pro | 393 | 852 | 3 |
| iPhone 14 Pro Max | 430 | 932 | 3 |
| iPhone 16 | 393 | 852 | 3 |
| iPhone 16 Pro Max | 440 | 956 | 3 |
| iPad Mini | 744 | 1133 | 2 |
| iPad Air | 820 | 1180 | 2 |
| iPad Pro 12.9" | 1024 | 1366 | 2 |
| Samsung Galaxy S24 | 360 | 780 | 3 |
| Pixel 8 | 412 | 915 | 2.625 |
| Desktop 1280 | 1280 | 800 | 1 |
| Desktop 1440 | 1440 | 900 | 1 |
| Desktop 1920 | 1920 | 1080 | 1 |

## Canvas Area

### Background

When device simulation is active, the canvas area background changes from solid `#1e1e1e` to a checkerboard dot grid pattern:

```css
background: repeating-conic-gradient(#1a1a1a 0% 25%, #1e1e1e 0% 50%) 0 0 / 16px 16px;
```

### Iframe Positioning

The iframe is centered in the canvas area both horizontally and vertically. A subtle box shadow is applied to visually separate it from the grid background:

```css
box-shadow: 0 2px 16px rgba(0, 0, 0, 0.4);
```

### Transform Behavior

The iframe wrapper div applies the transform:

```css
.iframe-wrapper {
  width: {deviceWidth}px;
  height: {deviceHeight}px;
  transform: scale({scaleFactor});
  transform-origin: center center;
}
```

The wrapper's container uses flexbox centering. Since `transform: scale()` doesn't affect layout flow, the container must account for the visual size difference — set the container dimensions to `deviceWidth * scale` and `deviceHeight * scale`.

## Touch Cursor Simulation

When the touch cursor toggle is active:

1. The iframe's cursor is overridden by injecting a style via postMessage
2. A custom CSS cursor (circle) is shown when hovering over the iframe
3. This is purely visual — no touch event simulation

### Implementation

Add a new message type to the editor → iframe protocol:

```typescript
| { type: "SET_TOUCH_CURSOR"; enabled: boolean }
```

The inspector script handles this by toggling a `<style>` element:
```css
* { cursor: none !important; }
```

The editor overlays a 20px translucent circle on the iframe via a positioned div that follows mouse movement.

## State Management

All device simulator state lives in the App component:

```typescript
const [deviceMode, setDeviceMode] = useState<string>("responsive");
const [deviceWidth, setDeviceWidth] = useState<number>(0);   // 0 = fill available
const [deviceHeight, setDeviceHeight] = useState<number>(0);
const [zoomMode, setZoomMode] = useState<"fit" | number>("fit");
const [touchCursor, setTouchCursor] = useState(false);
```

When `deviceMode` is "responsive" and width/height are 0, the iframe fills the available space (current behavior, no transform scaling). This is the default state on load.

## Files Modified

| File | Changes |
|------|---------|
| `cli/editor/src/App.tsx` | Add DeviceToolbar component, iframe wrapper with transform logic, state management |
| `cli/editor/src/styles/editor.css` | Toolbar styles, grid background, iframe wrapper, touch cursor overlay |
| `cli/editor/src/types.ts` | Add `SET_TOUCH_CURSOR` message type, DevicePreset interface |
| `cli/editor/src/devices.ts` | New file: device presets array |
| `cli/src/injected/inspector.ts` | Handle `SET_TOUCH_CURSOR` message |

## Edge Cases

- **Desktop presets wider than canvas**: Scale will be < 1, iframe shrinks to fit. "100% zoom" may cause horizontal overflow — in that case, the canvas area becomes scrollable.
- **Responsive mode with no dimensions**: Falls back to current behavior (iframe fills center panel).
- **Rotating a desktop preset**: 1920×1080 becomes 1080×1920, which is valid and useful for testing portrait desktop layouts.
- **Switching pages while in device mode**: Device settings persist across page switches.
- **Very small canvas area** (e.g. narrow browser window): Minimum scale factor clamped to 0.1 to prevent the iframe from becoming unusable.
