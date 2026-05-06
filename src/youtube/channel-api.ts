import {
  MAX_PLAYLIST_PREVIEW_ITEMS,
  type PlaylistPreviewVideo,
} from "./preview-schema";

const YOUTUBE_CHANNEL_VIDEOS_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/search";

type ChannelPreviewSuccess = {
  ok: true;
  items: PlaylistPreviewVideo[];
};

type ChannelPreviewFailure = {
  ok: false;
  status: "unauthorized" | "unavailable" | "failed";
  message: string;
};

export type FetchChannelPreviewResult =
  | ChannelPreviewSuccess
  | ChannelPreviewFailure;

type YouTubeApiErrorPayload = {
  error?: {
    message?: string;
  };
};

type ChannelVideosResponsePayload = YouTubeApiErrorPayload & {
  items?: unknown;
};

type RawChannelVideoItem = {
  id?: {
    videoId?: unknown;
  };
  snippet?: {
    title?: unknown;
    channelTitle?: unknown;
    thumbnails?: {
      high?: { url?: unknown };
      medium?: { url?: unknown };
      default?: { url?: unknown };
    };
  };
};

export async function fetchYouTubeChannelVideos(
  accessToken: string,
  channelId: string,
  fetchImpl: typeof fetch = fetch
): Promise<FetchChannelPreviewResult> {
  const url = createChannelVideosUrl(channelId);

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

  return {
    ok: true,
    items: normalizeChannelVideoItems(payload?.items),
  };
}

function createChannelVideosUrl(channelId: string) {
  const url = new URL(YOUTUBE_CHANNEL_VIDEOS_ENDPOINT);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("maxResults", String(MAX_PLAYLIST_PREVIEW_ITEMS));
  url.searchParams.set("order", "date");
  url.searchParams.set("type", "video");
  return url.toString();
}

async function readJson(
  response: Response
): Promise<ChannelVideosResponsePayload | null> {
  try {
    return (await response.json()) as ChannelVideosResponsePayload;
  } catch {
    return null;
  }
}

function mapErrorResult(
  statusCode: number,
  payload: YouTubeApiErrorPayload | null
): ChannelPreviewFailure {
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
        apiMessage || "YouTube channel videos are temporarily unavailable.",
    };
  }

  return {
    ok: false,
    status: "failed",
    message: apiMessage || "Unable to load channel videos from YouTube.",
  };
}

function normalizeChannelVideoItems(rawItems: unknown): PlaylistPreviewVideo[] {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((value) => normalizeChannelVideoItem(value as RawChannelVideoItem))
    .filter((item): item is PlaylistPreviewVideo => item !== null);
}

function normalizeChannelVideoItem(
  value: RawChannelVideoItem
): PlaylistPreviewVideo | null {
  const videoId =
    typeof value.id?.videoId === "string" ? value.id.videoId : null;
  const title =
    typeof value.snippet?.title === "string" ? value.snippet.title.trim() : "";

  if (!videoId || !title) {
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

  const channelTitle =
    typeof value.snippet?.channelTitle === "string"
      ? value.snippet.channelTitle
      : null;

  return {
    videoId,
    title,
    thumbnailUrl,
    channelTitle,
  };
}

function extractApiMessage(payload: YouTubeApiErrorPayload | null): string | null {
  const message = payload?.error?.message;
  if (typeof message === "string" && message.length > 0) {
    return message;
  }
  return null;
}
