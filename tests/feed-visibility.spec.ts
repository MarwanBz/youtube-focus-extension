import { expect, test } from "@playwright/test";
import { syncHomeFeedVisibility } from "../content-script/src/feedVisibility";

const HOME_FEED_FIXTURE = `
  <ytd-app>
    <ytd-browse page-subtype="home">
      <ytd-feed-filter-chip-bar-renderer id="chips"></ytd-feed-filter-chip-bar-renderer>
      <ytd-rich-grid-renderer id="grid"></ytd-rich-grid-renderer>
      <ytd-rich-section-renderer id="section"></ytd-rich-section-renderer>
      <ytd-reel-shelf-renderer id="reel-shelf"></ytd-reel-shelf-renderer>
      <ytd-continuation-item-renderer id="continuation"></ytd-continuation-item-renderer>
    </ytd-browse>
    <ytd-watch-flexy>
      <ytd-rich-grid-renderer id="watch-grid"></ytd-rich-grid-renderer>
    </ytd-watch-flexy>
  </ytd-app>
`;

test.describe("YouTube home feed visibility", () => {
  test("hides only the home recommendation containers", async ({ page }) => {
    await page.setContent(HOME_FEED_FIXTURE);

    const result = await page.evaluate((fnText) => {
      const syncVisibility = new Function(`return (${fnText})`)() as (
        root: ParentNode,
        shouldHide: boolean
      ) => ReturnType<typeof syncHomeFeedVisibility>;

      syncVisibility(document, true);

      return {
        chipsDisplay: getComputedStyle(document.getElementById("chips")!).display,
        gridDisplay: getComputedStyle(document.getElementById("grid")!).display,
        sectionDisplay: getComputedStyle(
          document.getElementById("section")!
        ).display,
        reelShelfDisplay: getComputedStyle(
          document.getElementById("reel-shelf")!
        ).display,
        continuationDisplay: getComputedStyle(
          document.getElementById("continuation")!
        ).display,
        watchGridDisplay: getComputedStyle(
          document.getElementById("watch-grid")!
        ).display,
        hiddenMarkers: document.querySelectorAll(
          '[data-youtube-focus-hidden="true"]'
        ).length,
      };
    }, syncHomeFeedVisibility.toString());

    expect(result.chipsDisplay).toBe("none");
    expect(result.gridDisplay).toBe("none");
    expect(result.sectionDisplay).toBe("none");
    expect(result.reelShelfDisplay).toBe("none");
    expect(result.continuationDisplay).toBe("none");
    expect(result.watchGridDisplay).not.toBe("none");
    expect(result.hiddenMarkers).toBe(5);
  });

  test("restores previously hidden home feed containers", async ({ page }) => {
    await page.setContent(HOME_FEED_FIXTURE);

    const result = await page.evaluate((fnText) => {
      const syncVisibility = new Function(`return (${fnText})`)() as (
        root: ParentNode,
        shouldHide: boolean
      ) => ReturnType<typeof syncHomeFeedVisibility>;

      syncVisibility(document, true);
      const restoreResult = syncVisibility(document, false);

      return {
        chipsDisplay: getComputedStyle(document.getElementById("chips")!).display,
        gridDisplay: getComputedStyle(document.getElementById("grid")!).display,
        sectionDisplay: getComputedStyle(
          document.getElementById("section")!
        ).display,
        reelShelfDisplay: getComputedStyle(
          document.getElementById("reel-shelf")!
        ).display,
        continuationDisplay: getComputedStyle(
          document.getElementById("continuation")!
        ).display,
        hiddenMarkers: document.querySelectorAll(
          '[data-youtube-focus-hidden="true"]'
        ).length,
        restoredCount: restoreResult.restoredCount,
      };
    }, syncHomeFeedVisibility.toString());

    expect(result.chipsDisplay).not.toBe("none");
    expect(result.gridDisplay).not.toBe("none");
    expect(result.sectionDisplay).not.toBe("none");
    expect(result.reelShelfDisplay).not.toBe("none");
    expect(result.continuationDisplay).not.toBe("none");
    expect(result.hiddenMarkers).toBe(0);
    expect(result.restoredCount).toBe(5);
  });

  test("is idempotent across repeated hide calls", async ({ page }) => {
    await page.setContent(HOME_FEED_FIXTURE);

    const result = await page.evaluate((fnText) => {
      const syncVisibility = new Function(`return (${fnText})`)() as (
        root: ParentNode,
        shouldHide: boolean
      ) => ReturnType<typeof syncHomeFeedVisibility>;

      const first = syncVisibility(document, true);
      const second = syncVisibility(document, true);

      return {
        firstHiddenCount: first.hiddenCount,
        secondHiddenCount: second.hiddenCount,
        hiddenMarkers: document.querySelectorAll(
          '[data-youtube-focus-hidden="true"]'
        ).length,
      };
    }, syncHomeFeedVisibility.toString());

    expect(result).toEqual({
      firstHiddenCount: 5,
      secondHiddenCount: 0,
      hiddenMarkers: 5,
    });
  });
});
