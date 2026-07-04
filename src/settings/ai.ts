export const AI_SETTINGS_STORAGE_KEY = "youtubeFocusAiSettings";
export const AI_SETTINGS_STORAGE_AREA = "local";
export const AI_DEFAULT_MODEL = "gpt-5-mini";
const LEGACY_UNSUPPORTED_MODELS = new Set(["gpt-5.4-mini"]);

export type AiSettings = {
  enabled: boolean;
  provider: "openai";
  model: string;
  apiKey: string;
};

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  provider: "openai",
  model: AI_DEFAULT_MODEL,
  apiKey: "",
};

export function normalizeAiSettings(
  value: unknown,
  fallback: AiSettings = DEFAULT_AI_SETTINGS
): AiSettings {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  return {
    enabled:
      typeof value.enabled === "boolean" ? value.enabled : fallback.enabled,
    provider:
      value.provider === "openai" ? value.provider : fallback.provider,
    model: normalizeAiModel(value.model, fallback.model),
    apiKey:
      typeof value.apiKey === "string"
        ? value.apiKey.trim().slice(0, 256)
        : fallback.apiKey,
  };
}

export async function readAiSettings(): Promise<AiSettings> {
  const area = getLocalStorageArea();
  if (!area) {
    return { ...DEFAULT_AI_SETTINGS };
  }

  return new Promise((resolve) => {
    area.get(AI_SETTINGS_STORAGE_KEY, (items) => {
      resolve(
        normalizeAiSettings(
          items[AI_SETTINGS_STORAGE_KEY],
          DEFAULT_AI_SETTINGS
        )
      );
    });
  });
}

export async function writeAiSettings(
  settings: AiSettings
): Promise<AiSettings> {
  const normalized = normalizeAiSettings(settings, DEFAULT_AI_SETTINGS);
  const area = getLocalStorageArea();
  if (!area) {
    return normalized;
  }

  return new Promise((resolve, reject) => {
    area.set({ [AI_SETTINGS_STORAGE_KEY]: normalized }, () => {
      const error = getLastRuntimeError();
      if (error) {
        reject(error);
        return;
      }

      resolve(normalized);
    });
  });
}

export async function patchAiSettings(
  patch: Partial<AiSettings>
): Promise<AiSettings> {
  const current = await readAiSettings();
  return writeAiSettings({ ...current, ...patch });
}

export async function ensureAiSettings(): Promise<AiSettings> {
  const current = await readAiSettings();
  return writeAiSettings(current);
}

export function subscribeToAiSettings(
  handler: (settings: AiSettings) => void
) {
  void readAiSettings().then(handler);

  if (
    typeof chrome === "undefined" ||
    !chrome.storage?.onChanged?.addListener
  ) {
    return () => undefined;
  }

  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName !== AI_SETTINGS_STORAGE_AREA) {
      return;
    }

    const change = changes[AI_SETTINGS_STORAGE_KEY];
    if (!change) {
      return;
    }

    handler(normalizeAiSettings(change.newValue, DEFAULT_AI_SETTINGS));
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}

export function isAiApiKeySaved(settings: AiSettings) {
  return settings.apiKey.length > 0;
}

export function getAiApiKeyDisplayValue(settings: AiSettings) {
  return isAiApiKeySaved(settings) ? "API key saved locally" : "";
}

export function getAiApiKeyEditorState({
  draftApiKey,
  editing,
  settings,
}: {
  draftApiKey: string;
  editing: boolean;
  settings: AiSettings;
}) {
  const hasSavedKey = isAiApiKeySaved(settings);
  const showEditor = editing || !hasSavedKey;

  return {
    canSave: draftApiKey.trim().length > 0,
    hasSavedKey,
    showEditor,
    showSavedSummary: hasSavedKey && !showEditor,
  };
}

function getLocalStorageArea(): chrome.storage.StorageArea | null {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return null;
  }

  return chrome.storage.local;
}

function getLastRuntimeError() {
  if (typeof chrome === "undefined") {
    return null;
  }

  return chrome.runtime?.lastError ?? null;
}

function normalizeAiModel(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const model = value.trim().slice(0, 256);
  if (!model || LEGACY_UNSUPPORTED_MODELS.has(model)) {
    return fallback;
  }

  return model;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
