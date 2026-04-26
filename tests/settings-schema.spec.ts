import { expect, test } from "@playwright/test";
import {
  MAX_IMPORTED_PLAYLISTS,
  cloneFocusSettings,
  isFocusModeActive,
  normalizeFocusSettings,
} from "../src/settings/schema";
import { DEFAULT_FOCUS_SETTINGS } from "../src/settings/defaults";

test.describe("focus settings schema", () => {
  test("defaults imported playlists when missing", () => {
    const normalized = normalizeFocusSettings(
      {
        focusModeEnabled: true,
        manualPlaylists: [],
        disabledUntil: null,
      },
      DEFAULT_FOCUS_SETTINGS
    );

    expect(normalized.importedPlaylists).toEqual([]);
  });

  test("caps imported playlist snapshots to maximum", () => {
    const normalized = normalizeFocusSettings(
      {
        focusModeEnabled: true,
        manualPlaylists: [],
        importedPlaylists: Array.from(
          { length: MAX_IMPORTED_PLAYLISTS + 2 },
          (_, index) => ({
            id: `imported-${index}`,
            title: `Imported ${index}`,
            url: `https://www.youtube.com/playlist?list=PL_IMPORTED_${index}`,
          })
        ),
        disabledUntil: null,
      },
      DEFAULT_FOCUS_SETTINGS
    );

    expect(normalized.importedPlaylists).toHaveLength(MAX_IMPORTED_PLAYLISTS);
  });

  test("clones imported playlists deeply", () => {
    const original = normalizeFocusSettings(
      {
        focusModeEnabled: false,
        manualPlaylists: [],
        importedPlaylists: [
          {
            id: "imported-1",
            title: "Imported One",
            url: "https://www.youtube.com/playlist?list=PL_IMPORTED_1",
          },
        ],
        disabledUntil: null,
      },
      DEFAULT_FOCUS_SETTINGS
    );

    const cloned = cloneFocusSettings(original);
    cloned.importedPlaylists[0].title = "Changed";

    expect(original.importedPlaylists[0].title).toBe("Imported One");
  });

  test("treats a future disabledUntil value as temporarily inactive", () => {
    const now = Date.parse("2026-04-27T10:00:00.000Z");

    expect(
      isFocusModeActive(
        {
          ...DEFAULT_FOCUS_SETTINGS,
          focusModeEnabled: true,
          disabledUntil: "2026-04-27T10:15:00.000Z",
        },
        now
      )
    ).toBe(false);
  });

  test("reactivates focus mode after disabledUntil passes", () => {
    const now = Date.parse("2026-04-27T10:16:00.000Z");

    expect(
      isFocusModeActive(
        {
          ...DEFAULT_FOCUS_SETTINGS,
          focusModeEnabled: true,
          disabledUntil: "2026-04-27T10:15:00.000Z",
        },
        now
      )
    ).toBe(true);
  });
});
