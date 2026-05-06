import {
  DEFAULT_YOUTUBE_CHANNEL_PREVIEW_STATE,
  YOUTUBE_CHANNEL_PREVIEWS_STORAGE_AREA,
  YOUTUBE_CHANNEL_PREVIEWS_STORAGE_KEY,
  cloneYouTubeChannelPreviewState,
  normalizeYouTubeChannelPreviewState,
  type YouTubeChannelPreviewState,
} from "./channel-preview-schema";

type ChannelPreviewChangeHandler = (state: YouTubeChannelPreviewState) => void;

export async function readYouTubeChannelPreviewState(): Promise<YouTubeChannelPreviewState> {
  const area = getStorageArea();
  if (!area) {
    return cloneYouTubeChannelPreviewState(
      DEFAULT_YOUTUBE_CHANNEL_PREVIEW_STATE
    );
  }

  return new Promise((resolve) => {
    area.get(YOUTUBE_CHANNEL_PREVIEWS_STORAGE_KEY, (items) => {
      resolve(
        normalizeYouTubeChannelPreviewState(
          items[YOUTUBE_CHANNEL_PREVIEWS_STORAGE_KEY],
          DEFAULT_YOUTUBE_CHANNEL_PREVIEW_STATE
        )
      );
    });
  });
}

export async function writeYouTubeChannelPreviewState(
  state: YouTubeChannelPreviewState
): Promise<YouTubeChannelPreviewState> {
  const normalized = normalizeYouTubeChannelPreviewState(state);
  const area = getStorageArea();
  if (!area) {
    return normalized;
  }

  return new Promise((resolve, reject) => {
    area.set({ [YOUTUBE_CHANNEL_PREVIEWS_STORAGE_KEY]: normalized }, () => {
      const error = getLastRuntimeError();
      if (error) {
        reject(error);
        return;
      }

      resolve(cloneYouTubeChannelPreviewState(normalized));
    });
  });
}

export function subscribeToYouTubeChannelPreviewState(
  handler: ChannelPreviewChangeHandler
) {
  void readYouTubeChannelPreviewState().then(handler);

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
    if (areaName !== YOUTUBE_CHANNEL_PREVIEWS_STORAGE_AREA) {
      return;
    }

    const change = changes[YOUTUBE_CHANNEL_PREVIEWS_STORAGE_KEY];
    if (!change) {
      return;
    }

    handler(
      normalizeYouTubeChannelPreviewState(
        change.newValue,
        DEFAULT_YOUTUBE_CHANNEL_PREVIEW_STATE
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
