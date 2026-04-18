import {
  MAX_PLAYLIST_PREVIEW_ITEMS,
  type PlaylistPreviewVideo,
} from "./preview-schema";

const YOUTUBE_PLAYLIST_ITEMS_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/playlistItems";

type PlaylistPreviewSuccess = {
  ok: true;
  items: PlaylistPreviewVideo[];
};

type PlaylistPreviewFailure = {
  ok: false;
  status: "unauthorized" | "unavailable" | "failed";
  message: string;
};

export type FetchPlaylistPreviewResult =
  | PlaylistPreviewSuccess
  | PlaylistPreviewFailure;

type YouTubeApiErrorPayload = {
  error?: {
    message?: string;
  };
};

type PlaylistItemsResponsePayload = YouTubeApiErrorPayload & {
  items?: unknown;
};

type RawPlaylistItem = {
  snippet?: {
    title?: unknown;
    channelTitle?: unknown;
    videoOwnerChannelTitle?: unknown;
    thumbnails?: {
      high?: { url?: unknown };
      medium?: { url?: unknown };
      default?: { url?: unknown };
    };
    resourceId?: {
      videoId?: unknown;
    };
  };
  contentDetails?: {
    videoId?: unknown;
  };
};

export async function fetchYouTubePlaylistPreview(
  accessToken: string,
  playlistId: string,
  fetchImpl: typeof fetch = fetch
): Promise<FetchPlaylistPreviewResult> {
  const url = createPlaylistItemsUrl(playlistId);

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
      message: "Unable to reach YouTube right now. Check your connection and retry.",
    };
  }

  const payload = await readJson(response);
  if (!response.ok) {
    return mapErrorResult(response.status, payload);
  }

  return {
    ok: true,
    items: normalizePlaylistPreviewItems(payload?.items),
  };
}

function createPlaylistItemsUrl(playlistId: string) {
  const url = new URL(YOUTUBE_PLAYLIST_ITEMS_ENDPOINT);
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("playlistId", playlistId);
  url.searchParams.set("maxResults", String(MAX_PLAYLIST_PREVIEW_ITEMS));
  return url.toString();
}

async function readJson(
  response: Response
): Promise<PlaylistItemsResponsePayload | null> {
  try {
    return (await response.json()) as PlaylistItemsResponsePayload;
  } catch {
    return null;
  }
}

function mapErrorResult(
  statusCode: number,
  payload: YouTubeApiErrorPayload | null
): PlaylistPreviewFailure {
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
      message: apiMessage || "YouTube preview videos are temporarily unavailable.",
    };
  }

  return {
    ok: false,
    status: "failed",
    message: apiMessage || "Unable to load playlist previews from YouTube.",
  };
}

function normalizePlaylistPreviewItems(rawItems: unknown): PlaylistPreviewVideo[] {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((value) => normalizePlaylistPreviewItem(value as RawPlaylistItem))
    .filter((item): item is PlaylistPreviewVideo => item !== null);
}

function normalizePlaylistPreviewItem(
  value: RawPlaylistItem
): PlaylistPreviewVideo | null {
  const videoId =
    typeof value.contentDetails?.videoId === "string"
      ? value.contentDetails.videoId
      : typeof value.snippet?.resourceId?.videoId === "string"
        ? value.snippet.resourceId.videoId
        : null;
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
    typeof value.snippet?.videoOwnerChannelTitle === "string"
      ? value.snippet.videoOwnerChannelTitle
      : typeof value.snippet?.channelTitle === "string"
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
