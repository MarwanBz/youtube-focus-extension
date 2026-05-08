import { expect, test } from "@playwright/test";
import {
  MAX_SELECTED_CHANNELS,
  MAX_IMPORTED_PLAYLISTS,
  cloneFocusSettings,
  isFocusModeActive,
  normalizeFocusSettings,
} from "../src/settings/schema";
import { DEFAULT_FOCUS_SETTINGS } from "../src/settings/defaults";
import {
  CUSTOM_PERSONA_INSTRUCTION_MAX_LENGTH,
  DEFAULT_PERSONA_PRESET,
  DEFAULT_PERSONA_SLIDERS,
  getPersonaPreviewText,
} from "../src/settings/persona";

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
    expect(normalized.selectedChannels).toEqual([]);
    expect(normalized.personaPreset).toBe(DEFAULT_PERSONA_PRESET);
    expect(normalized.personaSliders).toEqual(DEFAULT_PERSONA_SLIDERS);
    expect(normalized.customPersonaInstruction).toBe("");
    expect(normalized.allowMildProfanity).toBe(true);
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

  test("normalizes persona settings safely", () => {
    const normalized = normalizeFocusSettings(
      {
        focusModeEnabled: true,
        manualPlaylists: [],
        importedPlaylists: [],
        selectedChannels: [],
        disabledUntil: null,
        personaPreset: "nonsense",
        personaSliders: {
          funny: 99,
          strict: -4,
          kind: 4.4,
        },
        customPersonaInstruction: `  ${"a".repeat(
          CUSTOM_PERSONA_INSTRUCTION_MAX_LENGTH + 20
        )}  `,
        allowMildProfanity: "yes",
      },
      DEFAULT_FOCUS_SETTINGS
    );

    expect(normalized.personaPreset).toBe(DEFAULT_PERSONA_PRESET);
    expect(normalized.personaSliders).toEqual({
      funny: 10,
      strict: 0,
      kind: 4,
    });
    expect(normalized.customPersonaInstruction).toHaveLength(
      CUSTOM_PERSONA_INSTRUCTION_MAX_LENGTH
    );
    expect(normalized.allowMildProfanity).toBe(true);
  });

  test("clones persona sliders deeply", () => {
    const original = normalizeFocusSettings(
      {
        ...DEFAULT_FOCUS_SETTINGS,
        personaSliders: {
          funny: 3,
          strict: 4,
          kind: 5,
        },
      },
      DEFAULT_FOCUS_SETTINGS
    );

    const cloned = cloneFocusSettings(original);
    cloned.personaSliders.funny = 10;

    expect(original.personaSliders.funny).toBe(3);
  });

  test("builds persona preview text from tone settings", () => {
    expect(
      getPersonaPreviewText({
        personaPreset: "funny",
        personaSliders: {
          funny: 8,
          strict: 5,
          kind: 5,
        },
        customPersonaInstruction: "",
      })
    ).toContain("sidebar");

    expect(
      getPersonaPreviewText({
        personaPreset: "custom",
        personaSliders: {
          funny: 5,
          strict: 5,
          kind: 5,
        },
        customPersonaInstruction: "sound like my sarcastic focus coach",
      })
    ).toContain("sarcastic focus coach");
  });

  test("caps selected channel snapshots to maximum", () => {
    const normalized = normalizeFocusSettings(
      {
        focusModeEnabled: true,
        manualPlaylists: [],
        importedPlaylists: [],
        selectedChannels: Array.from(
          { length: MAX_SELECTED_CHANNELS + 2 },
          (_, index) => ({
            id: `channel-${index}`,
            title: `Channel ${index}`,
            url: `https://www.youtube.com/channel/UC_${index}`,
          })
        ),
        disabledUntil: null,
      },
      DEFAULT_FOCUS_SETTINGS
    );

    expect(normalized.selectedChannels).toHaveLength(MAX_SELECTED_CHANNELS);
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
