import { expect, test } from "@playwright/test";
import { getFocusOverlayWheelRoute } from "../content-script/src/focusOverlay";

test.describe("Focus overlay wheel routing", () => {
  test("routes dominant vertical wheel gestures to the page", () => {
    expect(
      getFocusOverlayWheelRoute({
        deltaX: 6,
        deltaY: 42,
        shiftKey: false,
      })
    ).toEqual({
      kind: "page",
      delta: 42,
    });
  });

  test("routes dominant horizontal wheel gestures to the shelf", () => {
    expect(
      getFocusOverlayWheelRoute({
        deltaX: 32,
        deltaY: 8,
        shiftKey: false,
      })
    ).toEqual({
      kind: "section",
      delta: 32,
    });
  });

  test("treats shift-wheel as horizontal shelf scrolling", () => {
    expect(
      getFocusOverlayWheelRoute({
        deltaX: 0,
        deltaY: 24,
        shiftKey: true,
      })
    ).toEqual({
      kind: "section",
      delta: 24,
    });
  });
});
