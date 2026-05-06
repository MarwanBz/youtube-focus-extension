import type { SubscriptionChannel } from "./subscriptions-schema";

const YOUTUBE_SUBSCRIPTIONS_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/subscriptions";
const MAX_RESULTS_PER_PAGE = 50;
const MAX_PAGES = 10;
const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/channel/";

type SubscriptionsApiSuccess = {
  ok: true;
  items: SubscriptionChannel[];
  nextPageSeen: boolean;
};

type SubscriptionsApiFailure = {
  ok: false;
  status: "unauthorized" | "unavailable" | "failed";
  message: string;
};

export type FetchYouTubeSubscriptionsResult =
  | SubscriptionsApiSuccess
  | SubscriptionsApiFailure;

type YouTubeApiErrorPayload = {
  error?: {
    message?: string;
  };
};

type SubscriptionsResponsePayload = YouTubeApiErrorPayload & {
  items?: unknown;
  nextPageToken?: unknown;
};

type RawSubscriptionItem = {
  snippet?: {
    title?: unknown;
    resourceId?: {
      channelId?: unknown;
    };
    thumbnails?: {
      high?: { url?: unknown };
      medium?: { url?: unknown };
      default?: { url?: unknown };
    };
  };
};

export async function fetchYouTubeSubscriptions(
  accessToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<FetchYouTubeSubscriptionsResult> {
  const collected: SubscriptionChannel[] = [];
  let pageToken: string | null = null;
  let nextPageSeen = false;
  let pageCount = 0;

  while (pageCount < MAX_PAGES) {
    pageCount += 1;
    const url = createSubscriptionsListUrl(pageToken);

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch {
      return {
        ok: false,
        status: "unavailable",
        message:
          "Unable to reach YouTube right now. Check your connection and retry.",
      };
    }

    const payload = await readJson(response);
    if (!response.ok) {
      return mapErrorResult(response.status, payload);
    }

    collected.push(...normalizeSubscriptionItems(payload?.items));
    const nextPageToken =
      typeof payload?.nextPageToken === "string" && payload.nextPageToken.length > 0
        ? payload.nextPageToken
        : null;

    if (!nextPageToken) {
      return {
        ok: true,
        items: collected,
        nextPageSeen,
      };
    }

    nextPageSeen = true;
    pageToken = nextPageToken;
  }

  return {
    ok: true,
    items: collected,
    nextPageSeen,
  };
}

function createSubscriptionsListUrl(pageToken: string | null) {
  const url = new URL(YOUTUBE_SUBSCRIPTIONS_ENDPOINT);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("mine", "true");
  url.searchParams.set("maxResults", String(MAX_RESULTS_PER_PAGE));
  if (pageToken) {
    url.searchParams.set("pageToken", pageToken);
  }
  return url.toString();
}

async function readJson(
  response: Response
): Promise<SubscriptionsResponsePayload | null> {
  try {
    return (await response.json()) as SubscriptionsResponsePayload;
  } catch {
    return null;
  }
}

function mapErrorResult(
  statusCode: number,
  payload: YouTubeApiErrorPayload | null
): SubscriptionsApiFailure {
  const apiMessage = extractApiMessage(payload);

  if (statusCode === 401) {
    return {
      ok: false,
      status: "unauthorized",
      message:
        apiMessage ||
        "Authorization expired or was revoked. Reconnect YouTube and try again.",
    };
  }

  if (statusCode >= 500 || statusCode === 403) {
    return {
      ok: false,
      status: "unavailable",
      message:
        apiMessage ||
        "YouTube subscriptions are temporarily unavailable right now.",
    };
  }

  return {
    ok: false,
    status: "failed",
    message: apiMessage || "Unable to load subscriptions from YouTube.",
  };
}

function normalizeSubscriptionItems(rawItems: unknown): SubscriptionChannel[] {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((value) => normalizeSubscriptionItem(value as RawSubscriptionItem))
    .filter((channel): channel is SubscriptionChannel => channel !== null);
}

function normalizeSubscriptionItem(
  value: RawSubscriptionItem
): SubscriptionChannel | null {
  const id =
    typeof value.snippet?.resourceId?.channelId === "string"
      ? value.snippet.resourceId.channelId
      : null;
  const title =
    typeof value.snippet?.title === "string" ? value.snippet.title.trim() : "";

  if (!id || !title) {
    return null;
  }

  const thumbnailUrl =
    typeof value.snippet?.thumbnails?.high?.url === "string"
      ? value.snippet.thumbnails.high.url
      : typeof value.snippet?.thumbnails?.medium?.url === "string"
        ? value.snippet.thumbnails.medium.url
        : typeof value.snippet?.thumbnails?.default?.url === "string"
          ? value.snippet.thumbnails.default.url
          : null;

  return {
    id,
    title,
    url: `${YOUTUBE_CHANNEL_URL}${id}`,
    thumbnailUrl,
  };
}

function extractApiMessage(payload: YouTubeApiErrorPayload | null): string | null {
  const message = payload?.error?.message;
  if (typeof message === "string" && message.length > 0) {
    return message;
  }
  return null;
}
