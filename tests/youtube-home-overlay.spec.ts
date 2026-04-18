import { expect, test } from "@playwright/test";
import {
  getFocusOverlaySources,
  shouldRenderHomeFocusOverlay,
  WATCH_LATER_URL,
} from "../content-script/src/focusOverlay";
import { placeFocusOverlayHost } from "../content-script/src/youtubeHomeOverlay";

const YOUTUBE_HOME_FIXTURE = `
  <ytd-app>
    <ytd-browse page-subtype="home">
      <div id="primary">
        <ytd-rich-grid-renderer id="feed"></ytd-rich-grid-renderer>
      </div>
    </ytd-browse>
  </ytd-app>
`;

test.describe("YouTube home overlay placement", () => {
  test("places the overlay before the home feed when no banner is present", async ({
    page,
  }) => {
    await page.setContent(`
      ${YOUTUBE_HOME_FIXTURE}
      <div id="youtube-focus-overlay-root" hidden></div>
    `);

    const result = await page.evaluate((fnText) => {
      const placeHost = new Function(`return (${fnText})`)() as (
        host: HTMLElement,
        root: ParentNode
      ) => boolean;
      const host = document.getElementById("youtube-focus-overlay-root");

      if (!host) {
        return null;
      }

      return {
        placed: placeHost(host, document),
        nextTag: host.nextElementSibling?.tagName.toLowerCase(),
        parentId: host.parentElement?.id,
        hidden: host.hidden,
        width: host.style.width,
      };
    }, placeFocusOverlayHost.toString());

    expect(result).toEqual({
      placed: true,
      nextTag: "ytd-rich-grid-renderer",
      parentId: "primary",
      hidden: false,
      width: "100%",
    });
  });

  test("places the overlay after the banner host when the banner is present", async ({
    page,
  }) => {
    await page.setContent(`
      ${YOUTUBE_HOME_FIXTURE}
      <div id="youtube-focus-banner-root"></div>
      <div id="youtube-focus-overlay-root" hidden></div>
    `);

    await page.evaluate(() => {
      const primary = document.getElementById("primary");
      const banner = document.getElementById("youtube-focus-banner-root");
      const feed = document.getElementById("feed");

      if (primary && banner && feed) {
        primary.insertBefore(banner, feed);
      }
    });

    const result = await page.evaluate((fnText) => {
      const placeHost = new Function(`return (${fnText})`)() as (
        host: HTMLElement,
        root: ParentNode
      ) => boolean;
      const host = document.getElementById("youtube-focus-overlay-root");
      const banner = document.getElementById("youtube-focus-banner-root");

      if (!host || !banner) {
        return null;
      }

      const placed = placeHost(host, document);

      return {
        placed,
        previousId: host.previousElementSibling?.id,
        nextId: host.nextElementSibling?.id,
      };
    }, placeFocusOverlayHost.toString());

    expect(result).toEqual({
      placed: true,
      previousId: "youtube-focus-banner-root",
      nextId: "feed",
    });
  });

  test("hides the overlay host until the home feed is available", async ({
    page,
  }) => {
    await page.setContent(`<div id="youtube-focus-overlay-root"></div>`);

    const result = await page.evaluate((fnText) => {
      const placeHost = new Function(`return (${fnText})`)() as (
        host: HTMLElement,
        root: ParentNode
      ) => boolean;
      const host = document.getElementById("youtube-focus-overlay-root");

      if (!host) {
        return null;
      }

      return {
        placed: placeHost(host, document),
        hidden: host.hidden,
      };
    }, placeFocusOverlayHost.toString());

    expect(result).toEqual({
      placed: false,
      hidden: true,
    });
  });

  test("is idempotent across repeated placement calls", async ({ page }) => {
    await page.setContent(`
      ${YOUTUBE_HOME_FIXTURE}
      <div id="youtube-focus-banner-root"></div>
      <div id="youtube-focus-overlay-root" hidden></div>
    `);

    await page.evaluate(() => {
      const primary = document.getElementById("primary");
      const banner = document.getElementById("youtube-focus-banner-root");
      const feed = document.getElementById("feed");

      if (primary && banner && feed) {
        primary.insertBefore(banner, feed);
      }
    });

    const result = await page.evaluate((fnText) => {
      const placeHost = new Function(`return (${fnText})`)() as (
        host: HTMLElement,
        root: ParentNode
      ) => boolean;
      const host = document.getElementById("youtube-focus-overlay-root");
      const primary = document.getElementById("primary");

      if (!host || !primary) {
        return null;
      }

      const first = placeHost(host, document);
      const second = placeHost(host, document);

      return {
        first,
        second,
        overlayCount: primary.querySelectorAll("#youtube-focus-overlay-root")
          .length,
        previousId: host.previousElementSibling?.id,
        nextId: host.nextElementSibling?.id,
      };
    }, placeFocusOverlayHost.toString());

    expect(result).toEqual({
      first: true,
      second: true,
      overlayCount: 1,
      previousId: "youtube-focus-banner-root",
      nextId: "feed",
    });
  });
});

test.describe("Home overlay visibility", () => {
  test("renders only on the home route when focus mode is active", () => {
    expect(
      shouldRenderHomeFocusOverlay({ kind: "home", isHome: true }, true)
    ).toBe(true);
    expect(
      shouldRenderHomeFocusOverlay({ kind: "home", isHome: true }, false)
    ).toBe(false);
    expect(
      shouldRenderHomeFocusOverlay({ kind: "watch", isHome: false }, true)
    ).toBe(false);
  });

  test("includes Watch Later first and manual playlists after it", () => {
    const sources = getFocusOverlaySources({
      focusModeEnabled: true,
      disabledUntil: null,
      manualPlaylists: [
        {
          id: "playlist-1",
          title: "Engineering",
          url: "https://www.youtube.com/playlist?list=PL_ENGINEERING",
        },
        {
          id: "playlist-2",
          title: "Travel",
          url: "https://www.youtube.com/playlist?list=PL_TRAVEL",
        },
      ],
    });

    expect(sources).toEqual([
      {
        kind: "watch-later",
        title: "Watch Later",
        url: WATCH_LATER_URL,
      },
      {
        kind: "playlist",
        title: "Engineering",
        url: "https://www.youtube.com/playlist?list=PL_ENGINEERING",
      },
      {
        kind: "playlist",
        title: "Travel",
        url: "https://www.youtube.com/playlist?list=PL_TRAVEL",
      },
    ]);
  });

  test("still returns Watch Later when there are no manual playlists", () => {
    const sources = getFocusOverlaySources({
      focusModeEnabled: true,
      disabledUntil: null,
      manualPlaylists: [],
    });

    expect(sources).toEqual([
      {
        kind: "watch-later",
        title: "Watch Later",
        url: WATCH_LATER_URL,
      },
    ]);
  });
});
