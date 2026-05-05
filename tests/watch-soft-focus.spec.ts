import { expect, test } from "@playwright/test";
import {
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

const WATCH_MODULE_DEFS = `
  var WATCH_SUGGESTION_SELECTOR =
    "ytd-watch-flexy #secondary ytd-compact-video-renderer";
  var WATCH_SUGGESTION_CONTAINER_SELECTOR =
    "ytd-watch-flexy #secondary ytd-watch-next-secondary-results-renderer, ytd-watch-flexy #secondary #related";
  var WATCH_COMMENTS_SELECTOR = "ytd-watch-flexy ytd-comments#comments, ytd-watch-flexy #comments";
  var WATCH_DIMMED_MARKER = "youtubeFocusWatchDimmed";
  var MISSING_STYLE_VALUE = "__youtube_focus_missing__";
`;

const WATCH_VISIBILITY_HELPERS = `
  ${restoreInlineStyle.toString()}
  ${restoreAriaHidden.toString()}
  ${restoreDimmedWatchTarget.toString()}
  ${dimWatchTarget.toString()}
`;

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
      ({ fnText, defs }) => {
        const extract = eval(
          `(function() { ${defs}; return (${fnText}); })()`
        ) as (root: ParentNode) => ReturnType<typeof extractWatchSuggestionMetadata>;
        return extract(document);
      },
      {
        fnText: extractWatchSuggestionMetadata.toString(),
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
});
