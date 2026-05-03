import type { YouTubeRouteState } from "./youtubeHome";

const WATCH_NAVIGATION_EVENT = "yt-navigate-finish";
const WATCH_FOCUS_RETRY_MS = 500;
const WATCH_SUGGESTION_SELECTOR =
  "ytd-watch-flexy #secondary ytd-compact-video-renderer";

export type WatchSuggestionMetadata = {
  title: string;
  channelTitle: string | null;
  href: string | null;
};

export function shouldRenderWatchSoftFocus(
  routeState: YouTubeRouteState,
  focusModeActive: boolean
) {
  return routeState.kind === "watch" && focusModeActive;
}

export function extractWatchSuggestionMetadata(
  root: ParentNode = document
): WatchSuggestionMetadata[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(WATCH_SUGGESTION_SELECTOR)
  )
    .map((item) => {
      const titleElement =
        item.querySelector<HTMLElement>("#video-title") ??
        item.querySelector<HTMLElement>("[title]");
      const channelElement =
        item.querySelector<HTMLAnchorElement>("ytd-channel-name #text a") ??
        item.querySelector<HTMLAnchorElement>("#channel-name a");
      const linkElement =
        item.querySelector<HTMLAnchorElement>("#thumbnail") ??
        item.querySelector<HTMLAnchorElement>("a[href*='/watch']");

      const title =
        titleElement?.getAttribute("title")?.trim() ||
        titleElement?.textContent?.trim() ||
        "";

      if (!title) {
        return null;
      }

      return {
        title,
        channelTitle: channelElement?.textContent?.trim() || null,
        href: linkElement?.href || null,
      };
    })
    .filter((item): item is WatchSuggestionMetadata => item !== null);
}

export function placeWatchSoftFocusHost(
  host: HTMLElement,
  root: ParentNode = document
) {
  const anchor = root.querySelector<HTMLElement>(
    "ytd-watch-flexy #secondary-inner, ytd-watch-flexy #secondary"
  );

  if (!anchor) {
    host.hidden = true;
    return false;
  }

  host.style.display = "block";
  host.style.width = "100%";
  host.style.boxSizing = "border-box";

  if (host.parentElement !== anchor || host !== anchor.firstElementChild) {
    anchor.insertBefore(host, anchor.firstChild);
  }

  host.hidden = false;
  return true;
}

export function observeWatchSoftFocusPlacement(host: HTMLElement) {
  let frameId: number | null = null;

  const schedulePlacement = () => {
    if (frameId !== null) {
      return;
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = null;
      placeWatchSoftFocusHost(host);
    });
  };

  schedulePlacement();

  const observer = new MutationObserver(schedulePlacement);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener(WATCH_NAVIGATION_EVENT, schedulePlacement);

  const intervalId = window.setInterval(schedulePlacement, WATCH_FOCUS_RETRY_MS);

  return () => {
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
    }

    observer.disconnect();
    window.removeEventListener(WATCH_NAVIGATION_EVENT, schedulePlacement);
    window.clearInterval(intervalId);
  };
}
