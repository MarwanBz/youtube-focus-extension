import type { YouTubePlaylistFetchStatus } from "./schema";

export type PlaylistStatusCopy = {
  tone: "neutral" | "warning" | "error";
  text: string;
};

export function getPlaylistStatusCopy(
  status: YouTubePlaylistFetchStatus,
  lastError: string | null
): PlaylistStatusCopy | null {
  if (status === "loading") {
    return {
      tone: "neutral",
      text: "Loading playlists...",
    };
  }

  if (status === "empty") {
    return {
      tone: "neutral",
      text: "No playlists found for this channel yet.",
    };
  }

  if (status === "channel_required") {
    return {
      tone: "warning",
      text: "Create a YouTube channel to upload videos or create playlists.",
    };
  }

  if (status === "unauthorized") {
    return {
      tone: "error",
      text: "Authorization expired or was revoked. Reconnect YouTube and retry.",
    };
  }

  if (status === "unavailable") {
    return {
      tone: "warning",
      text: "YouTube playlist import is temporarily unavailable. Retry soon.",
    };
  }

  if (status === "failed") {
    return {
      tone: "error",
      text: lastError || "Unable to import playlists right now.",
    };
  }

  return null;
}
