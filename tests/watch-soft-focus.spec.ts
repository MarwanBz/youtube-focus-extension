import { expect, test } from "@playwright/test";
import {
  extractWatchSuggestionMetadata,
  placeWatchSoftFocusHost,
  shouldRenderWatchSoftFocus,
} from "../content-script/src/watchSoftFocus";

const WATCH_PAGE_FIXTURE = `
  <ytd-app>
    <ytd-watch-flexy>
      <div id="secondary">
        <div id="secondary-inner">
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
        </div>
      </div>
    </ytd-watch-flexy>
  </ytd-app>
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

    const result = await page.evaluate((fnText) => {
      const extract = new Function(`return (${fnText})`)() as (
        root: ParentNode
      ) => ReturnType<typeof extractWatchSuggestionMetadata>;

      return extract(document);
    }, extractWatchSuggestionMetadata.toString());

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
        nextId: host.nextElementSibling?.id,
        hidden: host.hidden,
      };
    }, placeWatchSoftFocusHost.toString());

    expect(result).toEqual({
      placed: true,
      parentId: "secondary-inner",
      nextId: "suggestion-1",
      hidden: false,
    });
  });
});
