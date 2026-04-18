import {
  DEFAULT_YOUTUBE_PLAYLIST_STATE,
  YOUTUBE_PLAYLISTS_STORAGE_AREA,
  YOUTUBE_PLAYLISTS_STORAGE_KEY,
  normalizeYouTubePlaylistState,
  type YouTubePlaylistState,
} from "./schema";

type PlaylistChangeHandler = (state: YouTubePlaylistState) => void;

export async function readYouTubePlaylistState(): Promise<YouTubePlaylistState> {
  const area = getStorageArea();
  if (!area) {
    return { ...DEFAULT_YOUTUBE_PLAYLIST_STATE };
  }

  return new Promise((resolve) => {
    area.get(YOUTUBE_PLAYLISTS_STORAGE_KEY, (items) => {
      resolve(
        normalizeYouTubePlaylistState(
          items[YOUTUBE_PLAYLISTS_STORAGE_KEY],
          DEFAULT_YOUTUBE_PLAYLIST_STATE
        )
      );
    });
  });
}

export async function writeYouTubePlaylistState(
  state: YouTubePlaylistState
): Promise<YouTubePlaylistState> {
  const normalized = normalizeYouTubePlaylistState(state);
  const area = getStorageArea();
  if (!area) {
    return normalized;
  }

  return new Promise((resolve, reject) => {
    area.set({ [YOUTUBE_PLAYLISTS_STORAGE_KEY]: normalized }, () => {
      const error = getLastRuntimeError();
      if (error) {
        reject(error);
        return;
      }

      resolve(normalized);
    });
  });
}

export async function patchYouTubePlaylistState(
  patch: Partial<YouTubePlaylistState>
): Promise<YouTubePlaylistState> {
  const current = await readYouTubePlaylistState();
  return writeYouTubePlaylistState({ ...current, ...patch });
}

export function subscribeToYouTubePlaylistState(handler: PlaylistChangeHandler) {
  void readYouTubePlaylistState().then(handler);

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
    if (areaName !== YOUTUBE_PLAYLISTS_STORAGE_AREA) {
      return;
    }

    const change = changes[YOUTUBE_PLAYLISTS_STORAGE_KEY];
    if (!change) {
      return;
    }

    handler(
      normalizeYouTubePlaylistState(
        change.newValue,
        DEFAULT_YOUTUBE_PLAYLIST_STATE
      )
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
