import { expect, test } from "@playwright/test";
import {
  getYouTubeRouteState,
  isYouTubeHomeUrl,
} from "../content-script/src/youtubeHome";

test.describe("YouTube route detection", () => {
  test("identifies the YouTube home route", () => {
    expect(isYouTubeHomeUrl("https://www.youtube.com/")).toBe(true);
    expect(
      isYouTubeHomeUrl("https://www.youtube.com/?bp=wgUCEAE%3D")
    ).toBe(true);
  });

  test("keeps non-home YouTube routes out of focus mode", () => {
    const cases = [
      ["https://www.youtube.com/watch?v=abc", "watch"],
      ["https://www.youtube.com/shorts/abc", "shorts"],
      ["https://www.youtube.com/results?search_query=focus", "search"],
      ["https://www.youtube.com/playlist?list=PL123", "playlist"],
      ["https://www.youtube.com/feed/subscriptions", "subscriptions"],
      ["https://www.youtube.com/@example", "channel"],
    ] as const;

    for (const [url, routeKind] of cases) {
      expect(getYouTubeRouteState(url)).toMatchObject({
        kind: routeKind,
        isHome: false,
      });
    }
  });

  test("ignores external and malformed URLs", () => {
    expect(getYouTubeRouteState("https://example.com/")).toMatchObject({
      kind: "external",
      isHome: false,
    });
    expect(getYouTubeRouteState("not a url")).toMatchObject({
      kind: "external",
      isHome: false,
    });
  });
});
