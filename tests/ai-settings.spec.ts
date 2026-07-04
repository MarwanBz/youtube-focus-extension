import { expect, test } from "@playwright/test";
import {
  normalizeAiSettings,
  isAiApiKeySaved,
  getAiApiKeyDisplayValue,
  getAiApiKeyEditorState,
  DEFAULT_AI_SETTINGS,
  AI_DEFAULT_MODEL,
} from "../src/settings/ai";

test.describe.skip("AI settings schema", () => {
  test("returns defaults for null input", () => {
    const normalized = normalizeAiSettings(null);
    expect(normalized).toEqual(DEFAULT_AI_SETTINGS);
  });

  test("returns defaults for non-object input", () => {
    const normalized = normalizeAiSettings("garbage");
    expect(normalized).toEqual(DEFAULT_AI_SETTINGS);
  });

  test("returns defaults for empty object", () => {
    const normalized = normalizeAiSettings({});
    expect(normalized).toEqual({
      enabled: false,
      provider: "openai",
      model: AI_DEFAULT_MODEL,
      apiKey: "",
    });
  });

  test("preserves valid enabled state", () => {
    const normalized = normalizeAiSettings({
      enabled: true,
      provider: "openai",
      model: "gpt-5-mini",
      apiKey: "sk-test",
    });
    expect(normalized.enabled).toBe(true);
  });

  test("falls back to default enabled when type is wrong", () => {
    const normalized = normalizeAiSettings({ enabled: "yes" });
    expect(normalized.enabled).toBe(false);
  });

  test("normalizes provider to openai only", () => {
    const normalized = normalizeAiSettings({
      provider: "gemini",
      model: "gpt-5-mini",
    });
    expect(normalized.provider).toBe("openai");
  });

  test("preserves valid model", () => {
    const normalized = normalizeAiSettings({
      model: "gpt-5-mini",
    });
    expect(normalized.model).toBe("gpt-5-mini");
  });

  test("trims model whitespace", () => {
    const normalized = normalizeAiSettings({
      model: "  gpt-5-mini  ",
    });
    expect(normalized.model).toBe("gpt-5-mini");
  });

  test("migrates the old unsupported GPT-5.4 mini default", () => {
    const normalized = normalizeAiSettings({
      model: "gpt-5.4-mini",
    });
    expect(normalized.model).toBe(AI_DEFAULT_MODEL);
  });

  test("falls back to default model when empty string", () => {
    const normalized = normalizeAiSettings({
      model: "",
    });
    expect(normalized.model).toBe(AI_DEFAULT_MODEL);
  });

  test("caps model at 256 characters", () => {
    const longModel = "x".repeat(300);
    const normalized = normalizeAiSettings({
      model: longModel,
    });
    expect(normalized.model).toHaveLength(256);
  });

  test("preserves valid api key", () => {
    const normalized = normalizeAiSettings({
      apiKey: "sk-test123",
    });
    expect(normalized.apiKey).toBe("sk-test123");
  });

  test("trims api key whitespace", () => {
    const normalized = normalizeAiSettings({
      apiKey: "  sk-test123  ",
    });
    expect(normalized.apiKey).toBe("sk-test123");
  });

  test("caps api key at 256 characters", () => {
    const longKey = "k".repeat(300);
    const normalized = normalizeAiSettings({
      apiKey: longKey,
    });
    expect(normalized.apiKey).toHaveLength(256);
  });

  test("falls back to empty api key when type is wrong", () => {
    const normalized = normalizeAiSettings({ apiKey: 123 });
    expect(normalized.apiKey).toBe("");
  });

  test("isApiKeySaved returns true when key is set", () => {
    expect(
      isAiApiKeySaved({ ...DEFAULT_AI_SETTINGS, apiKey: "sk-test" })
    ).toBe(true);
  });

  test("isApiKeySaved returns false when key is empty", () => {
    expect(isAiApiKeySaved(DEFAULT_AI_SETTINGS)).toBe(false);
  });

  test("getAiApiKeyDisplayValue shows saved message when key exists", () => {
    expect(
      getAiApiKeyDisplayValue({ ...DEFAULT_AI_SETTINGS, apiKey: "sk-test" })
    ).toBe("API key saved locally");
  });

  test("getAiApiKeyDisplayValue returns empty string when no key", () => {
    expect(getAiApiKeyDisplayValue(DEFAULT_AI_SETTINGS)).toBe("");
  });

  test("keeps the API key editor visible while unsaved draft text is typed", () => {
    expect(
      getAiApiKeyEditorState({
        draftApiKey: "sk-unsaved",
        editing: false,
        settings: DEFAULT_AI_SETTINGS,
      })
    ).toEqual({
      canSave: true,
      hasSavedKey: false,
      showEditor: true,
      showSavedSummary: false,
    });
  });

  test("shows the saved API key summary only after persisted settings contain a key", () => {
    expect(
      getAiApiKeyEditorState({
        draftApiKey: "",
        editing: false,
        settings: { ...DEFAULT_AI_SETTINGS, apiKey: "sk-saved" },
      })
    ).toEqual({
      canSave: false,
      hasSavedKey: true,
      showEditor: false,
      showSavedSummary: true,
    });
  });

  test("shows the API key editor while replacing a persisted key", () => {
    expect(
      getAiApiKeyEditorState({
        draftApiKey: "",
        editing: true,
        settings: { ...DEFAULT_AI_SETTINGS, apiKey: "sk-saved" },
      })
    ).toMatchObject({
      hasSavedKey: true,
      showEditor: true,
      showSavedSummary: false,
    });
  });

  test("disabled state keeps api key intact through normalization", () => {
    const normalized = normalizeAiSettings({
      enabled: false,
      apiKey: "sk-keep-me",
      model: "gpt-5-mini",
    });
    expect(normalized.enabled).toBe(false);
    expect(normalized.apiKey).toBe("sk-keep-me");
  });

  test("clone preserves independence", () => {
    const original = normalizeAiSettings({
      enabled: true,
      provider: "openai",
      model: "my-model",
      apiKey: "original-key",
    });
    const cloned = { ...original };
    cloned.model = "altered";
    cloned.apiKey = "altered-key";

    expect(original.model).toBe("my-model");
    expect(original.apiKey).toBe("original-key");
  });
});
