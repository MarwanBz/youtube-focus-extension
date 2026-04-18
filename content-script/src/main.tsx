import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import styles from "@lib/styles/globals.css?inline";
import App from "./App";
import {
  EXTENSION_HOST_ID,
  EXTENSION_MOUNT_ID,
  EXTENSION_STYLE_ID,
} from "./domIds";
import { observeMastheadPlacement } from "./youtubeMasthead";

const existing = document.getElementById(EXTENSION_HOST_ID);
const host = existing ?? document.createElement("div");
if (!existing) {
  host.id = EXTENSION_HOST_ID;
  host.hidden = true;
  document.body.appendChild(host);
}

const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: "open" });

if (!shadowRoot.getElementById(EXTENSION_STYLE_ID)) {
  const style = document.createElement("style");
  style.id = EXTENSION_STYLE_ID;
  style.textContent = styles;
  shadowRoot.appendChild(style);
}

let mountPoint = shadowRoot.getElementById(EXTENSION_MOUNT_ID);
if (!mountPoint) {
  mountPoint = document.createElement("div");
  mountPoint.id = EXTENSION_MOUNT_ID;
  shadowRoot.appendChild(mountPoint);
}

if (!mountPoint.dataset.reactMounted) {
  mountPoint.dataset.reactMounted = "true";
  createRoot(mountPoint).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

if (!host.dataset.youtubeFocusMastheadObserver) {
  host.dataset.youtubeFocusMastheadObserver = "true";
  observeMastheadPlacement(host);
}
