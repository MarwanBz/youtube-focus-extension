export type FeedVisibilityResult = {
  hiddenCount: number;
  restoredCount: number;
  targetsFound: number;
};

export function syncHomeFeedVisibility(
  root: ParentNode = document,
  shouldHide: boolean
): FeedVisibilityResult {
  const hiddenMarker = "youtubeFocusHidden";
  const missingStyleValue = "__youtube_focus_missing__";
  const homeFeedSelectors = [
    "ytd-browse[page-subtype='home'] ytd-rich-grid-renderer",
    "ytd-browse[page-subtype='home'] ytd-feed-filter-chip-bar-renderer",
    "ytd-browse[page-subtype='home'] ytd-rich-section-renderer",
    "ytd-browse[page-subtype='home'] ytd-reel-shelf-renderer",
    "ytd-browse[page-subtype='home'] ytd-continuation-item-renderer",
  ];

  const getFeedTargets = () => {
    const seen = new Set<HTMLElement>();

    for (const selector of homeFeedSelectors) {
      for (const match of root.querySelectorAll<HTMLElement>(selector)) {
        seen.add(match);
      }
    }

    return Array.from(seen);
  };

  const restoreInlineStyle = (
    target: HTMLElement,
    property: "display",
    value: string | undefined
  ) => {
    if (!value || value === missingStyleValue) {
      target.style.removeProperty(property);
      return;
    }

    target.style[property] = value;
  };

  const hideFeedTarget = (target: HTMLElement) => {
    if (target.dataset[hiddenMarker] === "true") {
      return false;
    }

    target.dataset[hiddenMarker] = "true";
    target.dataset.youtubeFocusDisplay =
      target.style.display || missingStyleValue;
    target.dataset.youtubeFocusAriaHidden =
      target.getAttribute("aria-hidden") ?? "";

    target.style.setProperty("display", "none", "important");
    target.setAttribute("aria-hidden", "true");

    return true;
  };

  const restoreFeedTarget = (target: HTMLElement) => {
    if (target.dataset[hiddenMarker] !== "true") {
      return false;
    }

    restoreInlineStyle(target, "display", target.dataset.youtubeFocusDisplay);

    const previousAriaHidden = target.dataset.youtubeFocusAriaHidden ?? "";
    if (previousAriaHidden) {
      target.setAttribute("aria-hidden", previousAriaHidden);
    } else {
      target.removeAttribute("aria-hidden");
    }

    delete target.dataset[hiddenMarker];
    delete target.dataset.youtubeFocusDisplay;
    delete target.dataset.youtubeFocusAriaHidden;
    return true;
  };

  const targets = getFeedTargets();
  let hiddenCount = 0;
  let restoredCount = 0;

  for (const target of targets) {
    if (shouldHide) {
      if (hideFeedTarget(target)) {
        hiddenCount += 1;
      }
      continue;
    }

    if (restoreFeedTarget(target)) {
      restoredCount += 1;
    }
  }

  if (!shouldHide) {
    for (const hiddenTarget of root.querySelectorAll<HTMLElement>(
      `[data-${hiddenMarker}="true"]`
    )) {
      if (restoreFeedTarget(hiddenTarget)) {
        restoredCount += 1;
      }
    }
  }

  return {
    hiddenCount,
    restoredCount,
    targetsFound: targets.length,
  };
}
