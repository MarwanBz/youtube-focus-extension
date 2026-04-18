import {
  DEFAULT_YOUTUBE_PLAYLIST_PREVIEW_STATE,
  YOUTUBE_PLAYLIST_PREVIEWS_STORAGE_AREA,
  YOUTUBE_PLAYLIST_PREVIEWS_STORAGE_KEY,
  cloneYouTubePlaylistPreviewState,
  normalizeYouTubePlaylistPreviewState,
  type YouTubePlaylistPreviewState,
} from "./preview-schema";

type PreviewChangeHandler = (state: YouTubePlaylistPreviewState) => void;

export async function readYouTubePlaylistPreviewState(): Promise<YouTubePlaylistPreviewState> {
  const area = getStorageArea();
  if (!area) {
    return cloneYouTubePlaylistPreviewState(
      DEFAULT_YOUTUBE_PLAYLIST_PREVIEW_STATE
    );
  }

  return new Promise((resolve) => {
    area.get(YOUTUBE_PLAYLIST_PREVIEWS_STORAGE_KEY, (items) => {
      resolve(
        normalizeYouTubePlaylistPreviewState(
          items[YOUTUBE_PLAYLIST_PREVIEWS_STORAGE_KEY],
          DEFAULT_YOUTUBE_PLAYLIST_PREVIEW_STATE
        )
      );
    });
  });
}

export async function writeYouTubePlaylistPreviewState(
  state: YouTubePlaylistPreviewState
): Promise<YouTubePlaylistPreviewState> {
  const normalized = normalizeYouTubePlaylistPreviewState(state);
  const area = getStorageArea();
  if (!area) {
    return normalized;
  }

  return new Promise((resolve, reject) => {
    area.set({ [YOUTUBE_PLAYLIST_PREVIEWS_STORAGE_KEY]: normalized }, () => {
      const error = getLastRuntimeError();
      if (error) {
        reject(error);
        return;
      }

      resolve(cloneYouTubePlaylistPreviewState(normalized));
    });
  });
}

export async function patchYouTubePlaylistPreviewState(
  patch: Partial<YouTubePlaylistPreviewState>
): Promise<YouTubePlaylistPreviewState> {
  const current = await readYouTubePlaylistPreviewState();
  return writeYouTubePlaylistPreviewState({ ...current, ...patch });
}

export function subscribeToYouTubePlaylistPreviewState(
  handler: PreviewChangeHandler
) {
  void readYouTubePlaylistPreviewState().then(handler);

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
    if (areaName !== YOUTUBE_PLAYLIST_PREVIEWS_STORAGE_AREA) {
      return;
    }

    const change = changes[YOUTUBE_PLAYLIST_PREVIEWS_STORAGE_KEY];
    if (!change) {
      return;
    }

    handler(
      normalizeYouTubePlaylistPreviewState(
        change.newValue,
        DEFAULT_YOUTUBE_PLAYLIST_PREVIEW_STATE
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
