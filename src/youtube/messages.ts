import type { FetchYouTubePlaylistsResult } from "./api";

export const FETCH_YOUTUBE_PLAYLISTS_MESSAGE = "youtube-focus/fetch-playlists";

export type FetchYouTubePlaylistsMessage = {
  type: typeof FETCH_YOUTUBE_PLAYLISTS_MESSAGE;
};

export type FetchYouTubePlaylistsResponse =
  | { ok: true; status: "ready" | "empty" }
  | {
      ok: false;
      status:
        | "not_connected"
        | "channel_required"
        | "unauthorized"
        | "unavailable"
        | "failed";
      message: string;
    };

export function isFetchYouTubePlaylistsMessage(
  value: unknown
): value is FetchYouTubePlaylistsMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === FETCH_YOUTUBE_PLAYLISTS_MESSAGE
  );
}

export function createFetchPlaylistsResponse(
  result: FetchYouTubePlaylistsResult | null
): FetchYouTubePlaylistsResponse {
  if (!result) {
    return {
      ok: false,
      status: "failed",
      message: "Unable to fetch playlists right now.",
    };
  }

  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      message: result.message,
    };
  }

  return {
    ok: true,
    status: result.items.length > 0 ? "ready" : "empty",
  };
}
