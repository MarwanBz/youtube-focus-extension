import {
  AUTH_STORAGE_AREA,
  AUTH_STORAGE_KEY,
  DEFAULT_YOUTUBE_AUTH_STATE,
  normalizeYouTubeAuthState,
  type YouTubeAuthState,
} from "./schema";

type AuthChangeHandler = (state: YouTubeAuthState) => void;

export async function readYouTubeAuthState(): Promise<YouTubeAuthState> {
  const area = getStorageArea();
  if (!area) {
    return { ...DEFAULT_YOUTUBE_AUTH_STATE };
  }

  return new Promise((resolve) => {
    area.get(AUTH_STORAGE_KEY, (items) => {
      resolve(
        normalizeYouTubeAuthState(
          items[AUTH_STORAGE_KEY],
          DEFAULT_YOUTUBE_AUTH_STATE
        )
      );
    });
  });
}

export async function writeYouTubeAuthState(
  state: YouTubeAuthState
): Promise<YouTubeAuthState> {
  const normalized = normalizeYouTubeAuthState(state);
  const area = getStorageArea();
  if (!area) {
    return normalized;
  }

  return new Promise((resolve, reject) => {
    area.set({ [AUTH_STORAGE_KEY]: normalized }, () => {
      const error = getLastRuntimeError();
      if (error) {
        reject(error);
        return;
      }

      resolve(normalized);
    });
  });
}

export async function patchYouTubeAuthState(
  patch: Partial<YouTubeAuthState>
): Promise<YouTubeAuthState> {
  const current = await readYouTubeAuthState();
  return writeYouTubeAuthState({ ...current, ...patch });
}

export function subscribeToYouTubeAuthState(handler: AuthChangeHandler) {
  void readYouTubeAuthState().then(handler);

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
    if (areaName !== AUTH_STORAGE_AREA) {
      return;
    }

    const change = changes[AUTH_STORAGE_KEY];
    if (!change) {
      return;
    }

    handler(
      normalizeYouTubeAuthState(change.newValue, DEFAULT_YOUTUBE_AUTH_STATE)
    );
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}

function getStorageArea(): chrome.storage.StorageArea | null {
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
