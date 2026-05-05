import type { YouTubeRouteState } from "./youtubeHome";

const WATCH_NAVIGATION_EVENT = "yt-navigate-finish";
const WATCH_FOCUS_RETRY_MS = 500;
const WATCH_SUGGESTION_SELECTOR =
  "ytd-watch-flexy #secondary ytd-compact-video-renderer";
const WATCH_SUGGESTION_CONTAINER_SELECTOR =
  "ytd-watch-flexy #secondary ytd-watch-next-secondary-results-renderer, ytd-watch-flexy #secondary #related";
const WATCH_COMMENTS_SELECTOR = "ytd-watch-flexy ytd-comments#comments, ytd-watch-flexy #comments";
const WATCH_DIMMED_MARKER = "youtubeFocusWatchDimmed";
const MISSING_STYLE_VALUE = "__youtube_focus_missing__";

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
  const anchor =
    root.querySelector<HTMLElement>("ytd-watch-flexy #secondary-inner") ??
    root.querySelector<HTMLElement>("ytd-watch-flexy #secondary");

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

export type WatchSoftFocusVisibilityResult = {
  dimmedCount: number;
};

export function syncWatchSoftFocusVisibility(
  root: ParentNode = document,
  options: {
    dimSuggestions: boolean;
    dimComments: boolean;
  }
): WatchSoftFocusVisibilityResult {
  let dimmedCount = 0;

  const suggestionTargets = root.querySelectorAll<HTMLElement>(
    WATCH_SUGGESTION_CONTAINER_SELECTOR
  );
  const commentTargets = root.querySelectorAll<HTMLElement>(WATCH_COMMENTS_SELECTOR);

  for (const target of suggestionTargets) {
    if (options.dimSuggestions) {
      if (dimWatchTarget(target)) {
        dimmedCount += 1;
      }
    } else {
      restoreDimmedWatchTarget(target);
    }
  }

  for (const target of commentTargets) {
    if (options.dimComments) {
      if (dimWatchTarget(target)) {
        dimmedCount += 1;
      }
    } else {
      restoreDimmedWatchTarget(target);
    }
  }

  if (!options.dimSuggestions && !options.dimComments) {
    for (const target of root.querySelectorAll<HTMLElement>(
      `[data-${WATCH_DIMMED_MARKER}="true"]`
    )) {
      restoreDimmedWatchTarget(target);
    }
  }

  return {
    dimmedCount,
  };
}

export function dimWatchTarget(target: HTMLElement) {
  if (target.dataset[WATCH_DIMMED_MARKER] === "true") {
    return false;
  }

  target.dataset[WATCH_DIMMED_MARKER] = "true";
  target.dataset.youtubeFocusWatchOpacity =
    target.style.opacity || MISSING_STYLE_VALUE;
  target.dataset.youtubeFocusWatchFilter =
    target.style.filter || MISSING_STYLE_VALUE;
  target.dataset.youtubeFocusWatchPointerEvents =
    target.style.pointerEvents || MISSING_STYLE_VALUE;
  target.dataset.youtubeFocusWatchUserSelect =
    target.style.userSelect || MISSING_STYLE_VALUE;
  target.dataset.youtubeFocusWatchAriaHidden =
    target.getAttribute("aria-hidden") ?? "";

  target.style.setProperty("opacity", "0.28", "important");
  target.style.setProperty("filter", "blur(4px)", "important");
  target.style.setProperty("pointer-events", "none", "important");
  target.style.setProperty("user-select", "none", "important");
  target.setAttribute("aria-hidden", "true");
  return true;
}

export function restoreDimmedWatchTarget(target: HTMLElement) {
  if (target.dataset[WATCH_DIMMED_MARKER] !== "true") {
    return false;
  }

  restoreInlineStyle(target, "opacity", target.dataset.youtubeFocusWatchOpacity);
  restoreInlineStyle(target, "filter", target.dataset.youtubeFocusWatchFilter);
  restoreInlineStyle(
    target,
    "pointerEvents",
    target.dataset.youtubeFocusWatchPointerEvents
  );
  restoreInlineStyle(
    target,
    "userSelect",
    target.dataset.youtubeFocusWatchUserSelect
  );
  restoreAriaHidden(target, target.dataset.youtubeFocusWatchAriaHidden);

  delete target.dataset[WATCH_DIMMED_MARKER];
  delete target.dataset.youtubeFocusWatchOpacity;
  delete target.dataset.youtubeFocusWatchFilter;
  delete target.dataset.youtubeFocusWatchPointerEvents;
  delete target.dataset.youtubeFocusWatchUserSelect;
  delete target.dataset.youtubeFocusWatchAriaHidden;
  return true;
}

export function restoreInlineStyle(
  target: HTMLElement,
  property: "display" | "opacity" | "filter" | "pointerEvents" | "userSelect",
  value: string | undefined
) {
  if (!value || value === MISSING_STYLE_VALUE) {
    target.style.removeProperty(
      property === "pointerEvents"
        ? "pointer-events"
        : property === "userSelect"
          ? "user-select"
          : property
    );
    return;
  }

  target.style[property] = value;
}

export function restoreAriaHidden(target: HTMLElement, value: string | undefined) {
  if (value) {
    target.setAttribute("aria-hidden", value);
    return;
  }

  target.removeAttribute("aria-hidden");
}
