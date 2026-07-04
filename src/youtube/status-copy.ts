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
      text: "No playlists found.",
    };
  }

  if (status === "channel_required") {
    return {
      tone: "warning",
      text: "Create a YouTube channel to use playlist import.",
    };
  }

  if (status === "unauthorized") {
    return {
      tone: "error",
      text: "Reconnect YouTube.",
    };
  }

  if (status === "unavailable") {
    return {
      tone: "warning",
      text: "YouTube import unavailable. Retry soon.",
    };
  }

  if (status === "failed") {
    return {
      tone: "error",
      text: lastError || "Unable to import playlists.",
    };
  }

  return null;
}
