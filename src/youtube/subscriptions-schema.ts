export const YOUTUBE_SUBSCRIPTIONS_STORAGE_KEY = "youtubeFocusSubscriptions";
export const YOUTUBE_SUBSCRIPTIONS_STORAGE_AREA = "local";

export const YOUTUBE_SUBSCRIPTION_FETCH_STATUSES = [
  "idle",
  "loading",
  "ready",
  "empty",
  "unauthorized",
  "unavailable",
  "failed",
] as const;

export type YouTubeSubscriptionFetchStatus =
  (typeof YOUTUBE_SUBSCRIPTION_FETCH_STATUSES)[number];

export type SubscriptionChannel = {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string | null;
};

export type YouTubeSubscriptionState = {
  status: YouTubeSubscriptionFetchStatus;
  items: SubscriptionChannel[];
  updatedAt: string | null;
  lastError: string | null;
  nextPageSeen: boolean;
};

export const DEFAULT_YOUTUBE_SUBSCRIPTION_STATE: YouTubeSubscriptionState = {
  status: "idle",
  items: [],
  updatedAt: null,
  lastError: null,
  nextPageSeen: false,
};

export function normalizeYouTubeSubscriptionState(
  value: unknown,
  fallback: YouTubeSubscriptionState = DEFAULT_YOUTUBE_SUBSCRIPTION_STATE
): YouTubeSubscriptionState {
  if (!isRecord(value)) {
    return cloneYouTubeSubscriptionState(fallback);
  }

  const status = normalizeStatus(value.status);
  const items = normalizeSubscriptionChannels(value.items);

  return {
    status,
    items,
    updatedAt:
      typeof value.updatedAt === "string" && value.updatedAt.length > 0
        ? value.updatedAt
        : null,
    lastError:
      typeof value.lastError === "string" && value.lastError.length > 0
        ? value.lastError
        : null,
    nextPageSeen:
      typeof value.nextPageSeen === "boolean" ? value.nextPageSeen : false,
  };
}

export function cloneYouTubeSubscriptionState(
  state: YouTubeSubscriptionState
): YouTubeSubscriptionState {
  return {
    ...state,
    items: state.items.map((item) => ({ ...item })),
  };
}

function normalizeStatus(value: unknown): YouTubeSubscriptionFetchStatus {
  if (typeof value !== "string") {
    return "idle";
  }

  return YOUTUBE_SUBSCRIPTION_FETCH_STATUSES.includes(
    value as YouTubeSubscriptionFetchStatus
  )
    ? (value as YouTubeSubscriptionFetchStatus)
    : "idle";
}

function normalizeSubscriptionChannels(value: unknown): SubscriptionChannel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isSubscriptionChannel).map((channel) => ({ ...channel }));
}

function isSubscriptionChannel(value: unknown): value is SubscriptionChannel {
  if (!isRecord(value)) {
    return false;
  }

  const validThumbnailUrl =
    typeof value.thumbnailUrl === "string" || value.thumbnailUrl === null;

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    value.id.length > 0 &&
    value.title.trim().length > 0 &&
    value.url.startsWith("https://www.youtube.com/channel/") &&
    validThumbnailUrl
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
