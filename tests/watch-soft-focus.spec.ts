import { expect, test } from "@playwright/test";
import {
  extractWatchSuggestionMetadataFromNode,
  extractWatchSuggestionMetadata,
  placeWatchSoftFocusHost,
  syncWatchSoftFocusVisibility,
  shouldRenderWatchSoftFocus,
  dimWatchTarget,
  restoreDimmedWatchTarget,
  restoreInlineStyle,
  restoreAriaHidden,
} from "../content-script/src/watchSoftFocus";

const WATCH_PAGE_FIXTURE = `
  <ytd-app>
    <ytd-watch-flexy>
      <div id="secondary">
        <div id="secondary-inner">
          <ytd-watch-next-secondary-results-renderer>
            <ytd-compact-video-renderer id="suggestion-1">
              <a id="thumbnail" href="https://www.youtube.com/watch?v=alpha"></a>
              <a id="video-title" title="Deep Work Tips">Deep Work Tips</a>
              <ytd-channel-name>
                <div id="text"><a>Focus Lab</a></div>
              </ytd-channel-name>
            </ytd-compact-video-renderer>
            <ytd-compact-video-renderer id="suggestion-2">
              <a id="thumbnail" href="https://www.youtube.com/watch?v=beta"></a>
              <a id="video-title">Calm Coding Session</a>
              <ytd-channel-name>
                <div id="text"><a>Signal Studio</a></div>
              </ytd-channel-name>
            </ytd-compact-video-renderer>
          </ytd-watch-next-secondary-results-renderer>
        </div>
      </div>
      <ytd-comments id="comments"></ytd-comments>
    </ytd-watch-flexy>
  </ytd-app>
`;

const WATCH_PAGE_SHADOW_FIXTURE = `
  <ytd-app>
    <ytd-watch-flexy>
      <div id="secondary">
        <div id="secondary-inner">
          <ytd-watch-next-secondary-results-renderer>
            <ytd-compact-video-renderer id="shadow-suggestion"></ytd-compact-video-renderer>
          </ytd-watch-next-secondary-results-renderer>
        </div>
      </div>
      <ytd-comments id="comments"></ytd-comments>
    </ytd-watch-flexy>
  </ytd-app>
`;

const WATCH_PAGE_LOCKUP_FIXTURE = `
  <ytd-app>
    <ytd-watch-flexy>
      <div id="secondary">
        <div id="secondary-inner">
          <div id="related">
            <yt-lockup-view-model id="lockup-suggestion"></yt-lockup-view-model>
          </div>
        </div>
      </div>
      <ytd-comments id="comments"></ytd-comments>
    </ytd-watch-flexy>
  </ytd-app>
`;

const WATCH_MODULE_DEFS = `
  var WATCH_SUGGESTION_SELECTOR =
    "ytd-watch-flexy #secondary ytd-compact-video-renderer, ytd-watch-flexy #secondary yt-lockup-view-model";
  var WATCH_SUGGESTION_CONTAINER_SELECTOR =
    "ytd-watch-flexy #secondary ytd-watch-next-secondary-results-renderer, ytd-watch-flexy #secondary #related";
  var WATCH_COMMENTS_SELECTOR = "ytd-watch-flexy ytd-comments#comments, ytd-watch-flexy #comments";
  var WATCH_DIMMED_MARKER = "youtubeFocusWatchDimmed";
  var MISSING_STYLE_VALUE = "__youtube_focus_missing__";
  var TITLE_SELECTORS = ["#video-title", "[title]"];
  var CHANNEL_SELECTORS = [
    "ytd-channel-name #text a",
    "#channel-name a",
    "#text a",
    "a[href*='/@']",
    "a[href*='/channel/']",
  ];
  var LINK_SELECTORS = [
    "#thumbnail",
    "a[href*='/watch']",
  ];
  function deepQuerySelector(root, selectors) {
    if (!root) return null;
    for (var i = 0; i < selectors.length; i++) {
      var found = root.querySelector(selectors[i]);
      if (found) return found;
    }
    if (root instanceof HTMLElement && root.shadowRoot) {
      for (var j = 0; j < selectors.length; j++) {
        var found = root.shadowRoot.querySelector(selectors[j]);
        if (found) return found;
      }
    }
    return null;
  }
`;

const WATCH_VISIBILITY_HELPERS = `
  ${restoreInlineStyle.toString()}
  ${restoreAriaHidden.toString()}
  ${restoreDimmedWatchTarget.toString()}
  ${dimWatchTarget.toString()}
`;

/*
 * AI sticker test helpers are intentionally disabled for the non-AI release.
 */

test.describe("Watch soft-focus foundation", () => {
  test("renders only on watch routes while focus mode is active", () => {
    expect(
      shouldRenderWatchSoftFocus({ kind: "watch", isHome: false }, true)
    ).toBe(true);
    expect(
      shouldRenderWatchSoftFocus({ kind: "watch", isHome: false }, false)
    ).toBe(false);
    expect(
      shouldRenderWatchSoftFocus({ kind: "home", isHome: true }, true)
    ).toBe(false);
  });

  test("extracts suggestion metadata from the watch page rail", async ({ page }) => {
    await page.setContent(WATCH_PAGE_FIXTURE);

    const result = await page.evaluate(
      ({ extractFnText, fromNodeFnText, defs }) => {
        const extract = eval(
          `(function() { ${defs}; var extractWatchSuggestionMetadataFromNode = ${fromNodeFnText}; return (${extractFnText}); })()`
        ) as (root: ParentNode) => ReturnType<typeof extractWatchSuggestionMetadata>;
        return extract(document);
      },
      {
        extractFnText: extractWatchSuggestionMetadata.toString(),
        fromNodeFnText: extractWatchSuggestionMetadataFromNode.toString(),
        defs: WATCH_MODULE_DEFS,
      }
    );

    expect(result).toEqual([
      {
        title: "Deep Work Tips",
        channelTitle: "Focus Lab",
        href: "https://www.youtube.com/watch?v=alpha",
      },
      {
        title: "Calm Coding Session",
        channelTitle: "Signal Studio",
        href: "https://www.youtube.com/watch?v=beta",
      },
    ]);
  });

  test("extracts suggestion metadata from Shadow DOM ytd-compact-video-renderer", async ({ page }) => {
    await page.setContent(WATCH_PAGE_SHADOW_FIXTURE);

    await page.evaluate(() => {
      const el = document.getElementById("shadow-suggestion");
      if (!el) return;
      const shadow = el.attachShadow({ mode: "open" });
      shadow.innerHTML = `
        <a id="thumbnail" href="https://www.youtube.com/watch?v=gamma"></a>
        <a id="video-title" title="Shadow Work Focus">Shadow Work Focus</a>
        <ytd-channel-name>
          <div id="text"><a>Dark Lab</a></div>
        </ytd-channel-name>
      `;
    });

    const result = await page.evaluate(
      ({ extractFnText, fromNodeFnText, defs }) => {
        const extract = eval(
          `(function() { ${defs}; var extractWatchSuggestionMetadataFromNode = ${fromNodeFnText}; return (${extractFnText}); })()`
        ) as (root: ParentNode) => ReturnType<typeof extractWatchSuggestionMetadata>;
        return extract(document);
      },
      {
        extractFnText: extractWatchSuggestionMetadata.toString(),
        fromNodeFnText: extractWatchSuggestionMetadataFromNode.toString(),
        defs: WATCH_MODULE_DEFS,
      }
    );

    expect(result).toEqual([
      {
        title: "Shadow Work Focus",
        channelTitle: "Dark Lab",
        href: "https://www.youtube.com/watch?v=gamma",
      },
    ]);
  });

  test("extracts suggestion metadata from Shadow DOM yt-lockup-view-model", async ({ page }) => {
    await page.setContent(WATCH_PAGE_LOCKUP_FIXTURE);

    await page.evaluate(() => {
      const el = document.getElementById("lockup-suggestion");
      if (!el) return;
      const shadow = el.attachShadow({ mode: "open" });
      shadow.innerHTML = `
        <a class="lockup-thumbnail" href="https://www.youtube.com/watch?v=delta">
          <img src="thumb.jpg">
        </a>
        <h3 title="Lit-based Focus">Lit-based Focus</h3>
        <div id="text"><a href="https://www.youtube.com/@LitCore">LitCore</a></div>
      `;
    });

    const result = await page.evaluate(
      ({ extractFnText, fromNodeFnText, defs }) => {
        const extract = eval(
          `(function() { ${defs}; var extractWatchSuggestionMetadataFromNode = ${fromNodeFnText}; return (${extractFnText}); })()`
        ) as (root: ParentNode) => ReturnType<typeof extractWatchSuggestionMetadata>;
        return extract(document);
      },
      {
        extractFnText: extractWatchSuggestionMetadata.toString(),
        fromNodeFnText: extractWatchSuggestionMetadataFromNode.toString(),
        defs: WATCH_MODULE_DEFS,
      }
    );

    expect(result).toEqual([
      {
        title: "Lit-based Focus",
        channelTitle: "LitCore",
        href: "https://www.youtube.com/watch?v=delta",
      },
    ]);
  });

  test("places the watch host at the top of the secondary rail", async ({ page }) => {
    await page.setContent(`
      ${WATCH_PAGE_FIXTURE}
      <div id="youtube-focus-watch-root" hidden></div>
    `);

    const result = await page.evaluate((fnText) => {
      const place = new Function(`return (${fnText})`)() as (
        host: HTMLElement,
        root: ParentNode
      ) => boolean;
      const host = document.getElementById("youtube-focus-watch-root");

      if (!host) {
        return null;
      }

      return {
        placed: place(host, document),
        parentId: host.parentElement?.id,
        nextTag: host.nextElementSibling?.tagName.toLowerCase(),
        hidden: host.hidden,
      };
    }, placeWatchSoftFocusHost.toString());

    expect(result).toEqual({
      placed: true,
      parentId: "secondary-inner",
      nextTag: "ytd-watch-next-secondary-results-renderer",
      hidden: false,
    });
  });

  test("dims suggestions and comments while watch soft focus is active", async ({
    page,
  }) => {
    await page.setContent(WATCH_PAGE_FIXTURE);

    const result = await page.evaluate(
      ({ fnText, defs, helpers }) => {
        const sync = eval(
          `(function() { ${defs}; ${helpers}; return (${fnText}); })()`
        ) as (
          root: ParentNode,
          options: { dimSuggestions: boolean; dimComments: boolean }
        ) => ReturnType<typeof syncWatchSoftFocusVisibility>;

        const visibility = sync(document, {
          dimSuggestions: true,
          dimComments: true,
        });
        const suggestionContainer = document.querySelector(
          "ytd-watch-next-secondary-results-renderer"
        ) as HTMLElement | null;
        const comments = document.getElementById("comments");

        return {
          visibility,
          suggestionOpacity: suggestionContainer
            ? getComputedStyle(suggestionContainer).opacity
            : null,
          suggestionPointerEvents: suggestionContainer
            ? getComputedStyle(suggestionContainer).pointerEvents
            : null,
          commentsOpacity: comments ? getComputedStyle(comments).opacity : null,
        };
      },
      {
        fnText: syncWatchSoftFocusVisibility.toString(),
        defs: WATCH_MODULE_DEFS,
        helpers: WATCH_VISIBILITY_HELPERS,
      }
    );

    expect(result.visibility).toEqual({
      dimmedCount: 2,
    });
    expect(result.suggestionOpacity).toBe("0.28");
    expect(result.suggestionPointerEvents).toBe("none");
    expect(result.commentsOpacity).toBe("0.28");
  });

  test("restores suggestions and comments when watch soft focus is cleared", async ({
    page,
  }) => {
    await page.setContent(WATCH_PAGE_FIXTURE);

    const result = await page.evaluate(
      ({ fnText, defs, helpers }) => {
        const sync = eval(
          `(function() { ${defs}; ${helpers}; return (${fnText}); })()`
        ) as (
          root: ParentNode,
          options: { dimSuggestions: boolean; dimComments: boolean }
        ) => ReturnType<typeof syncWatchSoftFocusVisibility>;

        sync(document, {
          dimSuggestions: true,
          dimComments: true,
        });
        sync(document, {
          dimSuggestions: false,
          dimComments: false,
        });

        const suggestionContainer = document.querySelector(
          "ytd-watch-next-secondary-results-renderer"
        ) as HTMLElement | null;
        const comments = document.getElementById("comments");

        return {
          suggestionOpacity: suggestionContainer
            ? getComputedStyle(suggestionContainer).opacity
            : null,
          suggestionPointerEvents: suggestionContainer
            ? getComputedStyle(suggestionContainer).pointerEvents
            : null,
          commentsOpacity: comments ? getComputedStyle(comments).opacity : null,
          dimMarkers: document.querySelectorAll(
            '[data-youtube-focus-watch-dimmed="true"]'
          ).length,
        };
      },
      {
        fnText: syncWatchSoftFocusVisibility.toString(),
        defs: WATCH_MODULE_DEFS,
        helpers: WATCH_VISIBILITY_HELPERS,
      }
    );

    expect(result.suggestionOpacity).toBe("1");
    expect(result.suggestionPointerEvents).toBe("auto");
    expect(result.commentsOpacity).toBe("1");
    expect(result.dimMarkers).toBe(0);
  });

  test.skip("attaches and dismisses inline stickers on revealed recommendations", async () => {
    // AI sticker DOM helpers are disabled for this non-AI release.
  });
});
