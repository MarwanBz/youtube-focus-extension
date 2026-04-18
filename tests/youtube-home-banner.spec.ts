import { expect, test } from "@playwright/test";
import { placeFocusBannerHost } from "../content-script/src/youtubeHomeBanner";

const YOUTUBE_HOME_FIXTURE = `
  <ytd-app>
    <ytd-browse page-subtype="home">
      <div id="primary">
        <ytd-rich-grid-renderer id="feed"></ytd-rich-grid-renderer>
      </div>
    </ytd-browse>
  </ytd-app>
`;

test.describe("YouTube home banner placement", () => {
  test("places the banner before the home feed", async ({ page }) => {
    await page.setContent(`
      ${YOUTUBE_HOME_FIXTURE}
      <div id="youtube-focus-banner-root" hidden></div>
    `);

    const result = await page.evaluate((fnText) => {
      const placeHost = new Function(`return (${fnText})`)() as (
        host: HTMLElement,
        root: ParentNode
      ) => boolean;
      const host = document.getElementById("youtube-focus-banner-root");

      if (!host) {
        return null;
      }

      return {
        placed: placeHost(host, document),
        nextTag: host.nextElementSibling?.tagName.toLowerCase(),
        parentId: host.parentElement?.id,
        hidden: host.hidden,
        display: host.style.display,
        width: host.style.width,
      };
    }, placeFocusBannerHost.toString());

    expect(result).toEqual({
      placed: true,
      nextTag: "ytd-rich-grid-renderer",
      parentId: "primary",
      hidden: false,
      display: "block",
      width: "100%",
    });
  });

  test("hides the banner host until the home feed is available", async ({
    page,
  }) => {
    await page.setContent(`<div id="youtube-focus-banner-root"></div>`);

    const result = await page.evaluate((fnText) => {
      const placeHost = new Function(`return (${fnText})`)() as (
        host: HTMLElement,
        root: ParentNode
      ) => boolean;
      const host = document.getElementById("youtube-focus-banner-root");

      if (!host) {
        return null;
      }

      return {
        placed: placeHost(host, document),
        hidden: host.hidden,
      };
    }, placeFocusBannerHost.toString());

    expect(result).toEqual({
      placed: false,
      hidden: true,
    });
  });
});
