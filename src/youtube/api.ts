import { normalizePlaylistItems } from "./normalize";
import type { ImportedPlaylist } from "./schema";

const YOUTUBE_PLAYLISTS_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/playlists";
const MAX_RESULTS_PER_PAGE = 50;
const MAX_PAGES = 10;

type PlaylistsApiSuccess = {
  ok: true;
  items: ImportedPlaylist[];
  nextPageSeen: boolean;
};

type PlaylistsApiFailure = {
  ok: false;
  status: "channel_required" | "unauthorized" | "unavailable" | "failed";
  message: string;
};

export type FetchYouTubePlaylistsResult = PlaylistsApiSuccess | PlaylistsApiFailure;

type YouTubeApiErrorPayload = {
  error?: {
    message?: string;
  };
};

type YouTubePlaylistsResponsePayload = YouTubeApiErrorPayload & {
  items?: unknown;
  nextPageToken?: unknown;
};

export async function fetchYouTubePlaylists(
  accessToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<FetchYouTubePlaylistsResult> {
  const collected: ImportedPlaylist[] = [];
  let pageToken: string | null = null;
  let nextPageSeen = false;
  let pageCount = 0;

  while (pageCount < MAX_PAGES) {
    pageCount += 1;
    const url = createPlaylistsListUrl(pageToken);

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

    collected.push(...normalizePlaylistItems(payload?.items));
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

function createPlaylistsListUrl(pageToken: string | null) {
  const url = new URL(YOUTUBE_PLAYLISTS_ENDPOINT);
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("mine", "true");
  url.searchParams.set("maxResults", String(MAX_RESULTS_PER_PAGE));
  if (pageToken) {
    url.searchParams.set("pageToken", pageToken);
  }
  return url.toString();
}

async function readJson(
  response: Response
): Promise<YouTubePlaylistsResponsePayload | null> {
  try {
    return (await response.json()) as YouTubePlaylistsResponsePayload;
  } catch {
    return null;
  }
}

function mapErrorResult(
  statusCode: number,
  payload: YouTubeApiErrorPayload | null
): PlaylistsApiFailure {
  const apiMessage = extractApiMessage(payload);
  const normalizedApiMessage = apiMessage?.toLowerCase() ?? "";
  const channelMissing = isChannelMissingError(normalizedApiMessage);

  if (statusCode === 401) {
    return {
      ok: false,
      status: "unauthorized",
      message:
        apiMessage ||
        "Authorization expired or was revoked. Reconnect YouTube and try again.",
    };
  }

  if (statusCode === 403) {
    if (channelMissing) {
      return {
        ok: false,
        status: "channel_required",
        message: "Create a YouTube channel to upload videos or create playlists.",
      };
    }
    return {
      ok: false,
      status: "unavailable",
      message:
        apiMessage ||
        "YouTube playlist access is unavailable for this account right now.",
    };
  }

  if (statusCode >= 500) {
    return {
      ok: false,
      status: "unavailable",
      message: apiMessage || "YouTube is temporarily unavailable. Please retry.",
    };
  }

  if (statusCode === 404 && channelMissing) {
    return {
      ok: false,
      status: "channel_required",
      message: "Create a YouTube channel to upload videos or create playlists.",
    };
  }

  return {
    ok: false,
    status: "failed",
    message: apiMessage || "Unable to load playlists from YouTube.",
  };
}

function isChannelMissingError(normalizedApiMessage: string) {
  if (!normalizedApiMessage) {
    return false;
  }

  return (
    normalizedApiMessage.includes("channelnotfound") ||
    normalizedApiMessage.includes("channel not found") ||
    (normalizedApiMessage.includes("channel") &&
      normalizedApiMessage.includes("found")) ||
    normalizedApiMessage.includes("youtube channel")
  );
}

function extractApiMessage(payload: YouTubeApiErrorPayload | null): string | null {
  const message = payload?.error?.message;
  if (typeof message === "string" && message.length > 0) {
    return message;
  }
  return null;
}
