import { expect, test } from "@playwright/test";

import { DEFAULT_FOCUS_SETTINGS } from "../src/settings/defaults";
import {
  getTemporaryDisableBadgeText,
  createTemporaryDisableUntilIso,
  getTemporaryDisableDelayMs,
  getTemporaryDisableUiState,
} from "../src/settings/temporary-disable";

test.describe("temporary disable helpers", () => {
  test("creates a disabledUntil timestamp from a preset", () => {
    const now = Date.parse("2026-04-27T10:00:00.000Z");

    expect(createTemporaryDisableUntilIso(15, now)).toBe(
      "2026-04-27T10:15:00.000Z"
    );
    expect(createTemporaryDisableUntilIso(60, now)).toBe(
      "2026-04-27T11:00:00.000Z"
    );
  });

  test("shows pause actions only when focus mode is enabled and active", () => {
    expect(
      getTemporaryDisableUiState({
        ...DEFAULT_FOCUS_SETTINGS,
        focusModeEnabled: true,
      })
    ).toMatchObject({
      isPaused: false,
      showPauseActions: true,
      showResumeAction: false,
      statusText: null,
    });
  });

  test("shows paused status and resume action when disabledUntil is in the future", () => {
    const now = Date.parse("2026-04-27T10:00:00.000Z");

    expect(
      getTemporaryDisableUiState(
        {
          ...DEFAULT_FOCUS_SETTINGS,
          focusModeEnabled: true,
          disabledUntil: "2026-04-27T10:30:00.000Z",
        },
        {
          now,
          formatter: () => "10:30 AM",
        }
      )
    ).toMatchObject({
      isPaused: true,
      showPauseActions: false,
      showResumeAction: true,
      statusText: "Paused until 10:30 AM",
    });
  });

  test("hides temporary pause controls when focus mode is fully off", () => {
    expect(
      getTemporaryDisableUiState({
        ...DEFAULT_FOCUS_SETTINGS,
        focusModeEnabled: false,
        disabledUntil: "2026-04-27T10:30:00.000Z",
      })
    ).toMatchObject({
      isPaused: false,
      showPauseActions: false,
      showResumeAction: false,
      statusText: null,
    });
  });

  test("returns the remaining delay until auto resume", () => {
    const now = Date.parse("2026-04-27T10:00:00.000Z");

    expect(
      getTemporaryDisableDelayMs("2026-04-27T10:15:00.000Z", now)
    ).toBe(900000);
    expect(getTemporaryDisableDelayMs(null, now)).toBeNull();
  });

  test("formats compact badge text for the remaining pause time", () => {
    const now = Date.parse("2026-04-27T10:00:00.000Z");

    expect(
      getTemporaryDisableBadgeText("2026-04-27T10:15:00.000Z", now)
    ).toBe("15m");
    expect(
      getTemporaryDisableBadgeText("2026-04-27T11:00:00.000Z", now)
    ).toBe("1h");
    expect(getTemporaryDisableBadgeText(null, now)).toBe("");
  });
});
