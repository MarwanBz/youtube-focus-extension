export const YOUTUBE_PLAYLISTS_STORAGE_KEY = "youtubeFocusImportedPlaylists";
export const YOUTUBE_PLAYLISTS_STORAGE_AREA = "local";

export const YOUTUBE_PLAYLIST_FETCH_STATUSES = [
  "idle",
  "loading",
  "ready",
  "empty",
  "channel_required",
  "unauthorized",
  "unavailable",
  "failed",
] as const;

export type YouTubePlaylistFetchStatus =
  (typeof YOUTUBE_PLAYLIST_FETCH_STATUSES)[number];

export type ImportedPlaylist = {
  id: string;
  title: string;
  url: string;
  videoCount: number | null;
  thumbnailUrl: string | null;
};

export type YouTubePlaylistState = {
  status: YouTubePlaylistFetchStatus;
  items: ImportedPlaylist[];
  updatedAt: string | null;
  lastError: string | null;
  nextPageSeen: boolean;
};

export const DEFAULT_YOUTUBE_PLAYLIST_STATE: YouTubePlaylistState = {
  status: "idle",
  items: [],
  updatedAt: null,
  lastError: null,
  nextPageSeen: false,
};

export function normalizeYouTubePlaylistState(
  value: unknown,
  fallback: YouTubePlaylistState = DEFAULT_YOUTUBE_PLAYLIST_STATE
): YouTubePlaylistState {
  if (!isRecord(value)) {
    return cloneYouTubePlaylistState(fallback);
  }

  const status = normalizeStatus(value.status);
  const items = normalizeImportedPlaylists(value.items);

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
    nextPageSeen: typeof value.nextPageSeen === "boolean" ? value.nextPageSeen : false,
  };
}

export function cloneYouTubePlaylistState(
  state: YouTubePlaylistState
): YouTubePlaylistState {
  return {
    ...state,
    items: state.items.map((item) => ({ ...item })),
  };
}

function normalizeStatus(value: unknown): YouTubePlaylistFetchStatus {
  if (typeof value !== "string") {
    return "idle";
  }

  return YOUTUBE_PLAYLIST_FETCH_STATUSES.includes(
    value as YouTubePlaylistFetchStatus
  )
    ? (value as YouTubePlaylistFetchStatus)
    : "idle";
}

function normalizeImportedPlaylists(value: unknown): ImportedPlaylist[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isImportedPlaylist)
    .map((playlist) => ({ ...playlist }));
}

function isImportedPlaylist(value: unknown): value is ImportedPlaylist {
  if (!isRecord(value)) {
    return false;
  }

  const validVideoCount =
    typeof value.videoCount === "number" || value.videoCount === null;
  const validThumbnailUrl =
    typeof value.thumbnailUrl === "string" || value.thumbnailUrl === null;

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    value.id.length > 0 &&
    value.title.trim().length > 0 &&
    value.url.startsWith("https://www.youtube.com/playlist?list=") &&
    validVideoCount &&
    validThumbnailUrl
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
