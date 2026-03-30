import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles/editor.css";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
