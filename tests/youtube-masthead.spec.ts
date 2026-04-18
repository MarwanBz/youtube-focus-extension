import { expect, test } from "@playwright/test";
import {
  getMastheadPlacementState,
  placeFocusHostInMasthead,
} from "../content-script/src/youtubeMasthead";

const YOUTUBE_MASTHEAD_FIXTURE = `
  <ytd-app>
    <ytd-masthead>
      <div id="container">
        <div id="start"></div>
        <div id="center">
          <ytd-searchbox>
            <form id="search-form">
              <input id="search" name="search_query" />
            </form>
          </ytd-searchbox>
          <button id="voice-search-button" aria-label="Search with your voice"></button>
        </div>
        <div id="end"></div>
      </div>
    </ytd-masthead>
  </ytd-app>
`;

test.describe("YouTube masthead placement", () => {
  test("detects the search center as a valid focus-toggle target", async ({
    page,
  }) => {
    await page.setContent(YOUTUBE_MASTHEAD_FIXTURE);

    const state = await page.evaluate((fnText) => {
      const getState = new Function(`return (${fnText})`)() as (
        root: ParentNode
      ) => ReturnType<typeof getMastheadPlacementState>;

      return getState(document);
    }, getMastheadPlacementState.toString());

    expect(state).toEqual({
      canPlace: true,
      hasMasthead: true,
      hasCenter: true,
      hasSearchbox: true,
      hasVoiceSearchButton: true,
    });
  });

  test("moves the extension host to the end of YouTube's search center", async ({
    page,
  }) => {
    await page.setContent(`
      ${YOUTUBE_MASTHEAD_FIXTURE}
      <div id="extension-root" hidden></div>
    `);

    const result = await page.evaluate((fnText) => {
      const placeHost = new Function(`return (${fnText})`)() as (
        host: HTMLElement,
        root: ParentNode
      ) => boolean;
      const host = document.getElementById("extension-root");

      if (!host) {
        return null;
      }

      return {
        placed: placeHost(host, document),
        parentId: host.parentElement?.id,
        isLastChild: host.parentElement?.lastElementChild === host,
        hidden: host.hidden,
        display: host.style.display,
        height: host.style.height,
        marginLeft: host.style.marginLeft,
      };
    }, placeFocusHostInMasthead.toString());

    expect(result).toEqual({
      placed: true,
      parentId: "center",
      isLastChild: true,
      hidden: false,
      display: "inline-flex",
      height: "36px",
      marginLeft: "8px",
    });
  });

  test("hides the host until YouTube's masthead is available", async ({
    page,
  }) => {
    await page.setContent(`<div id="extension-root"></div>`);

    const result = await page.evaluate((fnText) => {
      const placeHost = new Function(`return (${fnText})`)() as (
        host: HTMLElement,
        root: ParentNode
      ) => boolean;
      const host = document.getElementById("extension-root");

      if (!host) {
        return null;
      }

      return {
        placed: placeHost(host, document),
        hidden: host.hidden,
      };
    }, placeFocusHostInMasthead.toString());

    expect(result).toEqual({
      placed: false,
      hidden: true,
    });
  });
});
