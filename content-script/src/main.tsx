import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import styles from "@lib/styles/globals.css?inline";
import {
  // HomeFocusBanner,
  HomeFocusOverlay,
  MastheadFocusToggle,
  WatchPageFocusFoundation,
} from "./App";
import {
  // EXTENSION_BANNER_HOST_ID,
  // EXTENSION_BANNER_MOUNT_ID,
  EXTENSION_HOST_ID,
  EXTENSION_MOUNT_ID,
  EXTENSION_OVERLAY_HOST_ID,
  EXTENSION_OVERLAY_MOUNT_ID,
  EXTENSION_WATCH_HOST_ID,
  EXTENSION_WATCH_MOUNT_ID,
  EXTENSION_STYLE_ID,
} from "./domIds";
// import { observeHomeBannerPlacement } from "./youtubeHomeBanner";
import { observeHomeOverlayPlacement } from "./youtubeHomeOverlay";
import { observeMastheadPlacement } from "./youtubeMasthead";
import { observeWatchSoftFocusPlacement } from "./watchSoftFocus";

const mastheadHost = mountShadowApp({
  hostId: EXTENSION_HOST_ID,
  mountId: EXTENSION_MOUNT_ID,
  render: <MastheadFocusToggle />,
});

if (!mastheadHost.dataset.youtubeFocusMastheadObserver) {
  mastheadHost.dataset.youtubeFocusMastheadObserver = "true";
  observeMastheadPlacement(mastheadHost);
}

// const bannerHost = mountShadowApp({
//   hostId: EXTENSION_BANNER_HOST_ID,
//   mountId: EXTENSION_BANNER_MOUNT_ID,
//   render: <HomeFocusBanner />,
// });

// if (!bannerHost.dataset.youtubeFocusBannerObserver) {
//   bannerHost.dataset.youtubeFocusBannerObserver = "true";
//   observeHomeBannerPlacement(bannerHost);
// }

const overlayHost = mountShadowApp({
  hostId: EXTENSION_OVERLAY_HOST_ID,
  mountId: EXTENSION_OVERLAY_MOUNT_ID,
  render: <HomeFocusOverlay />,
});

if (!overlayHost.dataset.youtubeFocusOverlayObserver) {
  overlayHost.dataset.youtubeFocusOverlayObserver = "true";
  observeHomeOverlayPlacement(overlayHost);
}

const watchHost = mountShadowApp({
  hostId: EXTENSION_WATCH_HOST_ID,
  mountId: EXTENSION_WATCH_MOUNT_ID,
  render: <WatchPageFocusFoundation />,
});

if (!watchHost.dataset.youtubeFocusWatchObserver) {
  watchHost.dataset.youtubeFocusWatchObserver = "true";
  observeWatchSoftFocusPlacement(watchHost);
}

function mountShadowApp({
  hostId,
  mountId,
  render,
}: {
  hostId: string;
  mountId: string;
  render: ReactNode;
}) {
  const existing = document.getElementById(hostId);
  const host = existing ?? document.createElement("div");
  if (!existing) {
    host.id = hostId;
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

  let mountPoint = shadowRoot.getElementById(mountId);
  if (!mountPoint) {
    mountPoint = document.createElement("div");
    mountPoint.id = mountId;
    shadowRoot.appendChild(mountPoint);
  }

  if (!mountPoint.dataset.reactMounted) {
    mountPoint.dataset.reactMounted = "true";
    createRoot(mountPoint).render(
      <StrictMode>
        {render}
      </StrictMode>
    );
  }

  return host;
}
