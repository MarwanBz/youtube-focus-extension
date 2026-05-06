import {
  DEFAULT_YOUTUBE_SUBSCRIPTION_STATE,
  YOUTUBE_SUBSCRIPTIONS_STORAGE_AREA,
  YOUTUBE_SUBSCRIPTIONS_STORAGE_KEY,
  cloneYouTubeSubscriptionState,
  normalizeYouTubeSubscriptionState,
  type YouTubeSubscriptionState,
} from "./subscriptions-schema";

type SubscriptionChangeHandler = (state: YouTubeSubscriptionState) => void;

export async function readYouTubeSubscriptionState(): Promise<YouTubeSubscriptionState> {
  const area = getStorageArea();
  if (!area) {
    return cloneYouTubeSubscriptionState(DEFAULT_YOUTUBE_SUBSCRIPTION_STATE);
  }

  return new Promise((resolve) => {
    area.get(YOUTUBE_SUBSCRIPTIONS_STORAGE_KEY, (items) => {
      resolve(
        normalizeYouTubeSubscriptionState(
          items[YOUTUBE_SUBSCRIPTIONS_STORAGE_KEY],
          DEFAULT_YOUTUBE_SUBSCRIPTION_STATE
        )
      );
    });
  });
}

export async function writeYouTubeSubscriptionState(
  state: YouTubeSubscriptionState
): Promise<YouTubeSubscriptionState> {
  const normalized = normalizeYouTubeSubscriptionState(state);
  const area = getStorageArea();
  if (!area) {
    return normalized;
  }

  return new Promise((resolve, reject) => {
    area.set({ [YOUTUBE_SUBSCRIPTIONS_STORAGE_KEY]: normalized }, () => {
      const error = getLastRuntimeError();
      if (error) {
        reject(error);
        return;
      }

      resolve(cloneYouTubeSubscriptionState(normalized));
    });
  });
}

export async function patchYouTubeSubscriptionState(
  patch: Partial<YouTubeSubscriptionState>
): Promise<YouTubeSubscriptionState> {
  const current = await readYouTubeSubscriptionState();
  return writeYouTubeSubscriptionState({ ...current, ...patch });
}

export function subscribeToYouTubeSubscriptionState(
  handler: SubscriptionChangeHandler
) {
  void readYouTubeSubscriptionState().then(handler);

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
    if (areaName !== YOUTUBE_SUBSCRIPTIONS_STORAGE_AREA) {
      return;
    }

    const change = changes[YOUTUBE_SUBSCRIPTIONS_STORAGE_KEY];
    if (!change) {
      return;
    }

    handler(
      normalizeYouTubeSubscriptionState(
        change.newValue,
        DEFAULT_YOUTUBE_SUBSCRIPTION_STATE
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
