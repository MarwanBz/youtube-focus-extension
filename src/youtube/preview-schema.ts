export const YOUTUBE_PLAYLIST_PREVIEWS_STORAGE_KEY =
  "youtubeFocusPlaylistPreviews";
export const YOUTUBE_PLAYLIST_PREVIEWS_STORAGE_AREA = "local";
export const MAX_PLAYLIST_PREVIEW_ITEMS = 20;

export type PlaylistPreviewVideo = {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  channelTitle: string | null;
};

export type PlaylistPreview = {
  playlistId: string;
  items: PlaylistPreviewVideo[];
  updatedAt: string | null;
};

export type YouTubePlaylistPreviewState = {
  playlists: PlaylistPreview[];
  updatedAt: string | null;
};

export const DEFAULT_YOUTUBE_PLAYLIST_PREVIEW_STATE: YouTubePlaylistPreviewState =
  {
    playlists: [],
    updatedAt: null,
  };

export function normalizeYouTubePlaylistPreviewState(
  value: unknown,
  fallback: YouTubePlaylistPreviewState = DEFAULT_YOUTUBE_PLAYLIST_PREVIEW_STATE
): YouTubePlaylistPreviewState {
  if (!isRecord(value)) {
    return cloneYouTubePlaylistPreviewState(fallback);
  }

  return {
    playlists: normalizePlaylistPreviews(value.playlists),
    updatedAt:
      typeof value.updatedAt === "string" && value.updatedAt.length > 0
        ? value.updatedAt
        : null,
  };
}

export function cloneYouTubePlaylistPreviewState(
  state: YouTubePlaylistPreviewState
): YouTubePlaylistPreviewState {
  return {
    ...state,
    playlists: state.playlists.map((playlist) => ({
      ...playlist,
      items: playlist.items.map((item) => ({ ...item })),
    })),
  };
}

function normalizePlaylistPreviews(value: unknown): PlaylistPreview[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isPlaylistPreview).map((playlist) => ({
    ...playlist,
    items: playlist.items.map((item) => ({ ...item })),
  }));
}

function isPlaylistPreview(value: unknown): value is PlaylistPreview {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.playlistId === "string" &&
    value.playlistId.length > 0 &&
    Array.isArray(value.items) &&
    value.items.every(isPlaylistPreviewVideo) &&
    (typeof value.updatedAt === "string" || value.updatedAt === null)
  );
}

export function isPlaylistPreviewVideo(
  value: unknown
): value is PlaylistPreviewVideo {
  if (!isRecord(value)) {
    return false;
  }

  const validThumbnail =
    typeof value.thumbnailUrl === "string" || value.thumbnailUrl === null;
  const validChannelTitle =
    typeof value.channelTitle === "string" || value.channelTitle === null;

  return (
    typeof value.videoId === "string" &&
    value.videoId.length > 0 &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    validThumbnail &&
    validChannelTitle
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
