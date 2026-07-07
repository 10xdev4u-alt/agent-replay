import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { default as App } from "./App.js";
import "./App.module.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
