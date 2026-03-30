import React from "react";
import { createRoot } from "react-dom/client";
import { OverlayScrollbars } from "overlayscrollbars";
import "overlayscrollbars/overlayscrollbars.css";
import { App } from "./App.js";
import "./styles/editor.css";

OverlayScrollbars.env().setDefaultOptions({
  scrollbars: { theme: "os-theme-dark", autoHide: "move", autoHideDelay: 500 },
});

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
