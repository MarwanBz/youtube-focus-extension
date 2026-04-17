import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import styles from "@lib/styles/globals.css?inline";
import App from "./App";

const existing = document.getElementById("extension-root");
const host = existing ?? document.createElement("div");
if (!existing) {
  host.id = "extension-root";
  document.body.appendChild(host);
}

const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: "open" });

const style = document.createElement("style");
style.textContent = styles;
shadowRoot.appendChild(style);

const mountPoint = document.createElement("div");
shadowRoot.appendChild(mountPoint);

createRoot(mountPoint).render(
  <StrictMode>
    <App />
  </StrictMode>
);
