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
    property: "display" | "visibility" | "pointerEvents" | "height" | "overflow" | "margin" | "padding",
    value: string | undefined
  ) => {
    if (!value || value === missingStyleValue) {
      target.style.removeProperty(property === "pointerEvents" ? "pointer-events" : property);
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
    target.dataset.youtubeFocusVisibility =
      target.style.visibility || missingStyleValue;
    target.dataset.youtubeFocusPointerEvents =
      target.style.pointerEvents || missingStyleValue;
    target.dataset.youtubeFocusHeight =
      target.style.height || missingStyleValue;
    target.dataset.youtubeFocusOverflow =
      target.style.overflow || missingStyleValue;
    target.dataset.youtubeFocusMargin =
      target.style.margin || missingStyleValue;
    target.dataset.youtubeFocusPadding =
      target.style.padding || missingStyleValue;
    target.dataset.youtubeFocusAriaHidden =
      target.getAttribute("aria-hidden") ?? "";

    target.style.setProperty("display", "block", "important");
    target.style.setProperty("height", "0px", "important");
    target.style.setProperty("min-height", "0px", "important");
    target.style.setProperty("overflow", "hidden", "important");
    target.style.setProperty("margin", "0px", "important");
    target.style.setProperty("padding", "0px", "important");
    target.style.setProperty("visibility", "hidden", "important");
    target.style.setProperty("pointer-events", "none", "important");
    target.setAttribute("aria-hidden", "true");

    // Force scroll container to remain active
    const app = document.querySelector("ytd-app");
    if (app && window.getComputedStyle(app).overflow === "hidden") {
      (app as HTMLElement).style.setProperty("overflow", "auto", "important");
    }
    if (window.getComputedStyle(document.body).overflow === "hidden") {
      document.body.style.setProperty("overflow", "auto", "important");
    }

    return true;
  };

  const restoreFeedTarget = (target: HTMLElement) => {
    if (target.dataset[hiddenMarker] !== "true") {
      return false;
    }

    restoreInlineStyle(target, "display", target.dataset.youtubeFocusDisplay);
    restoreInlineStyle(
      target,
      "visibility",
      target.dataset.youtubeFocusVisibility
    );
    restoreInlineStyle(
      target,
      "pointerEvents",
      target.dataset.youtubeFocusPointerEvents
    );
    restoreInlineStyle(target, "height", target.dataset.youtubeFocusHeight);
    restoreInlineStyle(target, "overflow", target.dataset.youtubeFocusOverflow);
    restoreInlineStyle(target, "margin", target.dataset.youtubeFocusMargin);
    restoreInlineStyle(target, "padding", target.dataset.youtubeFocusPadding);

    const previousAriaHidden = target.dataset.youtubeFocusAriaHidden ?? "";
    if (previousAriaHidden) {
      target.setAttribute("aria-hidden", previousAriaHidden);
    } else {
      target.removeAttribute("aria-hidden");
    }

    // Clean up scroll force if restoring
    const app = document.querySelector("ytd-app");
    if (app) (app as HTMLElement).style.removeProperty("overflow");
    document.body.style.removeProperty("overflow");

    delete target.dataset[hiddenMarker];
    delete target.dataset.youtubeFocusDisplay;
    delete target.dataset.youtubeFocusVisibility;
    delete target.dataset.youtubeFocusPointerEvents;
    delete target.dataset.youtubeFocusHeight;
    delete target.dataset.youtubeFocusOverflow;
    delete target.dataset.youtubeFocusMargin;
    delete target.dataset.youtubeFocusPadding;
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
