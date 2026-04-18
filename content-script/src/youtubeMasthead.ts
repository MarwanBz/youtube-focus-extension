export type MastheadPlacementState = {
  canPlace: boolean;
  hasMasthead: boolean;
  hasCenter: boolean;
  hasSearchbox: boolean;
  hasVoiceSearchButton: boolean;
};

const MASTHEAD_NAVIGATION_EVENT = "yt-navigate-finish";
const MASTHEAD_RETRY_MS = 500;

export function getMastheadPlacementState(
  root: ParentNode = document
): MastheadPlacementState {
  const masthead = root.querySelector("ytd-masthead");
  const center = masthead?.querySelector("#center") ?? null;

  return {
    canPlace: Boolean(center),
    hasMasthead: Boolean(masthead),
    hasCenter: Boolean(center),
    hasSearchbox: Boolean(
      center?.querySelector("ytd-searchbox, form#search-form, input#search")
    ),
    hasVoiceSearchButton: Boolean(
      center?.querySelector("#voice-search-button, button[aria-label*='voice']")
    ),
  };
}

export function placeFocusHostInMasthead(
  host: HTMLElement,
  root: ParentNode = document
) {
  const masthead = root.querySelector("ytd-masthead");
  const center = masthead?.querySelector<HTMLElement>("#center") ?? null;

  if (!center) {
    host.hidden = true;
    return false;
  }

  host.style.display = "inline-flex";
  host.style.alignItems = "center";
  host.style.flex = "0 0 auto";
  host.style.height = "40px";
  host.style.marginLeft = "8px";
  host.style.position = "relative";
  host.style.zIndex = "1";

  if (host.parentElement !== center || host.nextElementSibling) {
    center.appendChild(host);
  }

  host.hidden = false;
  return true;
}

export function observeMastheadPlacement(host: HTMLElement) {
  let frameId: number | null = null;

  const schedulePlacement = () => {
    if (frameId !== null) {
      return;
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = null;
      placeFocusHostInMasthead(host);
    });
  };

  schedulePlacement();

  const observer = new MutationObserver(schedulePlacement);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener(MASTHEAD_NAVIGATION_EVENT, schedulePlacement);

  const intervalId = window.setInterval(
    schedulePlacement,
    MASTHEAD_RETRY_MS
  );

  return () => {
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
    }

    observer.disconnect();
    window.removeEventListener(MASTHEAD_NAVIGATION_EVENT, schedulePlacement);
    window.clearInterval(intervalId);
  };
}
