import type { ImportedPlaylist } from "./schema";

type RawPlaylist = {
  id?: unknown;
  snippet?: {
    title?: unknown;
    thumbnails?: {
      medium?: { url?: unknown };
      default?: { url?: unknown };
    };
  };
  contentDetails?: {
    itemCount?: unknown;
  };
};

export function normalizePlaylistItems(rawItems: unknown): ImportedPlaylist[] {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((value) => normalizeSinglePlaylist(value as RawPlaylist))
    .filter((item): item is ImportedPlaylist => item !== null);
}

function normalizeSinglePlaylist(value: RawPlaylist): ImportedPlaylist | null {
  if (typeof value.id !== "string" || value.id.length === 0) {
    return null;
  }
  const title =
    typeof value.snippet?.title === "string"
      ? value.snippet.title.trim()
      : "";
  if (!title) {
    return null;
  }

  const thumbnailCandidate =
    typeof value.snippet?.thumbnails?.medium?.url === "string"
      ? value.snippet.thumbnails.medium.url
      : typeof value.snippet?.thumbnails?.default?.url === "string"
        ? value.snippet.thumbnails.default.url
        : null;

  const itemCount =
    typeof value.contentDetails?.itemCount === "number"
      ? value.contentDetails.itemCount
      : null;

  return {
    id: value.id,
    title,
    url: `https://www.youtube.com/playlist?list=${value.id}`,
    videoCount: itemCount,
    thumbnailUrl: thumbnailCandidate,
  };
}
