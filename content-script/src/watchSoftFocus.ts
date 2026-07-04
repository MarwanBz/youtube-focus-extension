/*
 * AI sticker DOM helpers are intentionally disabled for the non-AI release.
 * Keep the AI source files and dependencies for future revival.
 *
 * import {
 *   createRecommendationStickerKey,
 * } from "@/ai/stickers";
 * import {
 *   MAX_RECOMMENDATION_STICKER_REQUESTS,
 *   type RecommendationSticker,
 *   type RecommendationStickerInput,
 * } from "@/ai/sticker-schema";
 */
import type { YouTubeRouteState } from "./youtubeHome";

const WATCH_NAVIGATION_EVENT = "yt-navigate-finish";
const WATCH_FOCUS_RETRY_MS = 500;
const WATCH_SUGGESTION_SELECTOR =
  "ytd-watch-flexy #secondary ytd-compact-video-renderer, ytd-watch-flexy #secondary yt-lockup-view-model";
const WATCH_SUGGESTION_CONTAINER_SELECTOR =
  "ytd-watch-flexy #secondary ytd-watch-next-secondary-results-renderer, ytd-watch-flexy #secondary #related";
const WATCH_COMMENTS_SELECTOR = "ytd-watch-flexy ytd-comments#comments, ytd-watch-flexy #comments";
const WATCH_DIMMED_MARKER = "youtubeFocusWatchDimmed";
const MISSING_STYLE_VALUE = "__youtube_focus_missing__";
// const WATCH_STICKER_CLASS = "youtube-focus-recommendation-sticker";
// const WATCH_STICKER_BUTTON_CLASS = "youtube-focus-recommendation-sticker__dismiss";

const TITLE_SELECTORS = ["#video-title", "[title]"];
const CHANNEL_SELECTORS = [
  "ytd-channel-name #text a",
  "#channel-name a",
  "#text a",
  "a[href*='/@']",
  "a[href*='/channel/']",
];
const LINK_SELECTORS = [
  "#thumbnail",
  "a[href*='/watch']",
];

function deepQuerySelector<T extends Element>(
  root: ParentNode | null,
  selectors: string[]
): T | null {
  if (!root) return null;

  for (const selector of selectors) {
    const found = root.querySelector<T>(selector);
    if (found) return found;
  }

  if (root instanceof HTMLElement && root.shadowRoot) {
    for (const selector of selectors) {
      const found = root.shadowRoot.querySelector<T>(selector);
      if (found) return found;
    }
  }

  return null;
}

/*
 * Disabled for non-AI release.
 *
 * function findStickerAnchorElement(node: HTMLElement): HTMLElement | null {
 *   return deepQuerySelector<HTMLElement>(node, TITLE_SELECTORS);
 * }
 *
 * function getDomParentForSticker(
 *   anchor: HTMLElement | null
 * ): HTMLElement | ShadowRoot | null {
 *   if (!anchor) return null;
 *
 *   if (anchor.parentElement) {
 *     return anchor.parentElement;
 *   }
 *
 *   const root = anchor.getRootNode();
 *   if (root instanceof ShadowRoot) {
 *     return root;
 *   }
 *
 *   return null;
 * }
 */

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
    .map((item) => extractWatchSuggestionMetadataFromNode(item))
    .filter((item): item is WatchSuggestionMetadata => item !== null);
}

/*
 * Disabled for non-AI release.
 *
 * export function attachWatchRecommendationStickers(
 *   stickers: RecommendationSticker[],
 *   options: {
 *     root?: ParentNode;
 *     onDismiss?: (stickerKey: string) => void;
 *   } = {}
 * ) {
 *   const root = options.root ?? document;
 *   const stickerByKey = new Map(stickers.map((sticker) => [sticker.key, sticker]));
 *   const activeKeys = new Set(stickerByKey.keys());
 *
 *   for (const chip of root.querySelectorAll<HTMLElement>(
 *     `.${WATCH_STICKER_CLASS}`
 *   )) {
 *     const key = chip.dataset.youtubeFocusStickerKey;
 *     if (!key || !activeKeys.has(key)) {
 *       chip.remove();
 *     }
 *   }
 *
 *   const suggestionNodes = Array.from(
 *     root.querySelectorAll<HTMLElement>(WATCH_SUGGESTION_SELECTOR)
 *   ).slice(0, MAX_RECOMMENDATION_STICKER_REQUESTS);
 *   let attachedCount = 0;
 *
 *   for (const node of suggestionNodes) {
 *     const metadata = extractWatchSuggestionMetadataFromNode(node);
 *     if (!metadata) {
 *       continue;
 *     }
 *
 *     const matchingSticker = stickers.find(
 *       (sticker) =>
 *         sticker.key ===
 *         createRecommendationStickerKey(metadata, sticker.dateKey)
 *     );
 *     if (!matchingSticker) {
 *       continue;
 *     }
 *
 *     const anchor = findStickerAnchorElement(node);
 *     const parent = getDomParentForSticker(anchor);
 *     if (!parent) {
 *       continue;
 *     }
 *
 *     const existing =
 *       parent instanceof ShadowRoot
 *         ? null
 *         : parent.querySelector<HTMLElement>(`.${WATCH_STICKER_CLASS}`);
 *     if (
 *       existing?.dataset.youtubeFocusStickerKey === matchingSticker.key &&
 *       existing.dataset.youtubeFocusStickerText === matchingSticker.text
 *     ) {
 *       attachedCount += 1;
 *       continue;
 *     }
 *
 *     existing?.remove();
 *     parent.appendChild(
 *       createWatchStickerChip(matchingSticker, options.onDismiss)
 *     );
 *     attachedCount += 1;
 *   }
 *
 *   return { attachedCount };
 * }
 *
 * export function removeWatchRecommendationStickers(
 *   root: ParentNode = document
 * ) {
 *   let removedCount = 0;
 *   for (const chip of root.querySelectorAll<HTMLElement>(
 *     `.${WATCH_STICKER_CLASS}`
 *   )) {
 *     chip.remove();
 *     removedCount += 1;
 *   }
 *   return { removedCount };
 * }
 */

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

export function extractWatchSuggestionMetadataFromNode(
  item: HTMLElement
): WatchSuggestionMetadata | null {
  const titleElement = deepQuerySelector<HTMLElement>(item, TITLE_SELECTORS);
  const channelElement = deepQuerySelector<HTMLAnchorElement>(item, CHANNEL_SELECTORS);
  const linkElement = deepQuerySelector<HTMLAnchorElement>(item, LINK_SELECTORS);

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
}

/*
 * Disabled for non-AI release.
 *
 * export function createWatchStickerChip(
 *   sticker: RecommendationSticker,
 *   onDismiss?: (stickerKey: string) => void
 * ) {
 *   const chip = document.createElement("span");
 *   chip.className = WATCH_STICKER_CLASS;
 *   chip.dataset.youtubeFocusStickerKey = sticker.key;
 *   chip.dataset.youtubeFocusStickerText = sticker.text;
 *   chip.textContent = sticker.text;
 *   chip.style.alignItems = "center";
 *   chip.style.background = "rgba(62, 166, 255, 0.14)";
 *   chip.style.border = "1px solid rgba(62, 166, 255, 0.24)";
 *   chip.style.borderRadius = "999px";
 *   chip.style.boxSizing = "border-box";
 *   chip.style.color = "#f1f1f1";
 *   chip.style.display = "inline-flex";
 *   chip.style.fontFamily = "Roboto, Arial, sans-serif";
 *   chip.style.fontSize = "11px";
 *   chip.style.fontWeight = "500";
 *   chip.style.gap = "6px";
 *   chip.style.lineHeight = "1.3";
 *   chip.style.marginTop = "6px";
 *   chip.style.maxWidth = "100%";
 *   chip.style.padding = "4px 8px";
 *   chip.style.pointerEvents = "auto";
 *   chip.style.verticalAlign = "top";
 *
 *   const dismissButton = document.createElement("button");
 *   dismissButton.className = WATCH_STICKER_BUTTON_CLASS;
 *   dismissButton.type = "button";
 *   dismissButton.setAttribute("aria-label", "Dismiss AI sticker");
 *   dismissButton.textContent = "x";
 *   dismissButton.style.background = "transparent";
 *   dismissButton.style.border = "0";
 *   dismissButton.style.color = "#aaaaaa";
 *   dismissButton.style.cursor = "pointer";
 *   dismissButton.style.font = "inherit";
 *   dismissButton.style.lineHeight = "1";
 *   dismissButton.style.margin = "0";
 *   dismissButton.style.padding = "0";
 *   dismissButton.style.pointerEvents = "auto";
 *
 *   dismissButton.addEventListener("click", (event) => {
 *     event.preventDefault();
 *     event.stopPropagation();
 *     onDismiss?.(sticker.key);
 *     chip.remove();
 *   });
 *
 *   chip.appendChild(dismissButton);
 *   return chip;
 * }
 */
