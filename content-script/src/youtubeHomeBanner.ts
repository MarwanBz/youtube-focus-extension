const HOME_NAVIGATION_EVENT = "yt-navigate-finish";
const HOME_BANNER_RETRY_MS = 500;

export function placeFocusBannerHost(
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

  host.style.display = "block";
  host.style.width = "100%";
  host.style.boxSizing = "border-box";

  if (host.parentElement !== anchor.parentElement || host.nextElementSibling !== anchor) {
    anchor.parentElement.insertBefore(host, anchor);
  }

  host.hidden = false;
  return true;
}

export function observeHomeBannerPlacement(host: HTMLElement) {
  let frameId: number | null = null;

  const schedulePlacement = () => {
    if (frameId !== null) {
      return;
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = null;
      placeFocusBannerHost(host);
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
    HOME_BANNER_RETRY_MS
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
