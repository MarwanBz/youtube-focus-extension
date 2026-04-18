const HOME_NAVIGATION_EVENT = "yt-navigate-finish";
const HOME_OVERLAY_RETRY_MS = 500;

export function placeFocusOverlayHost(
  host: HTMLElement,
  root: ParentNode = document
) {
  const anchor = root.querySelector<HTMLElement>(
    "ytd-browse[page-subtype='home'] ytd-rich-grid-renderer, ytd-browse ytd-rich-grid-renderer, ytd-rich-grid-renderer"
  );

  if (!anchor?.parentElement) {
    host.hidden = true;
    return false;
  }

  const bannerHost = root.querySelector<HTMLElement>(
    "#youtube-focus-banner-root"
  );

  host.style.display = "block";
  host.style.width = "100%";
  host.style.boxSizing = "border-box";

  const targetParent = anchor.parentElement;
  const shouldPlaceAfterBanner =
    bannerHost?.parentElement === targetParent &&
    bannerHost.nextElementSibling === anchor;

  if (shouldPlaceAfterBanner) {
    if (
      bannerHost.nextElementSibling !== host ||
      host.parentElement !== targetParent
    ) {
      targetParent.insertBefore(host, anchor);
    }
  } else if (
    host.parentElement !== targetParent ||
    host.nextElementSibling !== anchor
  ) {
    targetParent.insertBefore(host, anchor);
  }

  host.hidden = false;
  return true;
}

export function observeHomeOverlayPlacement(host: HTMLElement) {
  let frameId: number | null = null;

  const schedulePlacement = () => {
    if (frameId !== null) {
      return;
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = null;
      placeFocusOverlayHost(host);
    });
  };

  schedulePlacement();

  const observer = new MutationObserver(schedulePlacement);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener(HOME_NAVIGATION_EVENT, schedulePlacement);

  const intervalId = window.setInterval(
    schedulePlacement,
    HOME_OVERLAY_RETRY_MS
  );

  return () => {
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
    }

    observer.disconnect();
    window.removeEventListener(HOME_NAVIGATION_EVENT, schedulePlacement);
    window.clearInterval(intervalId);
  };
}
