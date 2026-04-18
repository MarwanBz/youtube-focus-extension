import { expect, test } from "@playwright/test";
import { getFocusBannerContent } from "../content-script/src/focusBanner";

test.describe("Focus banner content", () => {
  test("uses the warning copy when focus mode is disabled", () => {
    const banner = getFocusBannerContent(false);

    expect(banner.variant).toBe("off");
    expect(banner.title).toBe("The Algorithm is in Control");
    expect(banner.body).toContain("maximize your watch time");
  });

  test("uses the control copy when focus mode is enabled", () => {
    const banner = getFocusBannerContent(true);

    expect(banner.variant).toBe("on");
    expect(banner.title).toBe("You're in Control Now");
    expect(banner.body).toContain("Watch Later queue");
  });
});
