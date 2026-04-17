import { DEFAULT_FOCUS_SETTINGS } from "./defaults";
import {
  cloneFocusSettings,
  normalizeFocusSettings,
  SETTINGS_STORAGE_AREA,
  SETTINGS_STORAGE_KEY,
  type FocusSettings,
} from "./schema";

type SettingsChangeHandler = (settings: FocusSettings) => void;

export async function readFocusSettings(): Promise<FocusSettings> {
  const area = getStorageArea();
  if (!area) {
    return cloneFocusSettings(DEFAULT_FOCUS_SETTINGS);
  }

  return new Promise((resolve) => {
    area.get(SETTINGS_STORAGE_KEY, (items) => {
      resolve(
        normalizeFocusSettings(
          items[SETTINGS_STORAGE_KEY],
          DEFAULT_FOCUS_SETTINGS
        )
      );
    });
  });
}

export async function writeFocusSettings(
  settings: FocusSettings
): Promise<FocusSettings> {
  const normalized = normalizeFocusSettings(settings, DEFAULT_FOCUS_SETTINGS);
  const area = getStorageArea();
  if (!area) {
    return normalized;
  }

  return new Promise((resolve, reject) => {
    area.set({ [SETTINGS_STORAGE_KEY]: normalized }, () => {
      const error = getLastRuntimeError();
      if (error) {
        reject(error);
        return;
      }

      resolve(cloneFocusSettings(normalized));
    });
  });
}

export async function patchFocusSettings(
  patch: Partial<FocusSettings>
): Promise<FocusSettings> {
  const current = await readFocusSettings();
  return writeFocusSettings({ ...current, ...patch });
}

export async function ensureFocusSettings(): Promise<FocusSettings> {
  const current = await readFocusSettings();
  return writeFocusSettings(current);
}

export function subscribeToFocusSettings(handler: SettingsChangeHandler) {
  void readFocusSettings().then(handler);

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
    if (areaName !== SETTINGS_STORAGE_AREA) {
      return;
    }

    const change = changes[SETTINGS_STORAGE_KEY];
    if (!change) {
      return;
    }

    handler(
      normalizeFocusSettings(change.newValue, DEFAULT_FOCUS_SETTINGS)
    );
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}

function getStorageArea(): chrome.storage.StorageArea | null {
  if (typeof chrome === "undefined" || !chrome.storage?.sync) {
    return null;
  }

  return chrome.storage.sync;
}

function getLastRuntimeError() {
  if (typeof chrome === "undefined") {
    return null;
  }

  return chrome.runtime?.lastError ?? null;
}
