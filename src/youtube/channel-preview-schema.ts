import {
  type PlaylistPreviewVideo,
  isPlaylistPreviewVideo,
} from "./preview-schema";

export const YOUTUBE_CHANNEL_PREVIEWS_STORAGE_KEY =
  "youtubeFocusChannelPreviews";
export const YOUTUBE_CHANNEL_PREVIEWS_STORAGE_AREA = "local";

export type ChannelPreview = {
  channelId: string;
  items: PlaylistPreviewVideo[];
  updatedAt: string | null;
};

export type YouTubeChannelPreviewState = {
  channels: ChannelPreview[];
  updatedAt: string | null;
};

export const DEFAULT_YOUTUBE_CHANNEL_PREVIEW_STATE: YouTubeChannelPreviewState =
  {
    channels: [],
    updatedAt: null,
  };

export function normalizeYouTubeChannelPreviewState(
  value: unknown,
  fallback: YouTubeChannelPreviewState = DEFAULT_YOUTUBE_CHANNEL_PREVIEW_STATE
): YouTubeChannelPreviewState {
  if (!isRecord(value)) {
    return cloneYouTubeChannelPreviewState(fallback);
  }

  return {
    channels: normalizeChannelPreviews(value.channels),
    updatedAt:
      typeof value.updatedAt === "string" && value.updatedAt.length > 0
        ? value.updatedAt
        : null,
  };
}

export function cloneYouTubeChannelPreviewState(
  state: YouTubeChannelPreviewState
): YouTubeChannelPreviewState {
  return {
    ...state,
    channels: state.channels.map((channel) => ({
      ...channel,
      items: channel.items.map((item) => ({ ...item })),
    })),
  };
}

function normalizeChannelPreviews(value: unknown): ChannelPreview[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isChannelPreview).map((channel) => ({
    ...channel,
    items: channel.items.map((item) => ({ ...item })),
  }));
}

function isChannelPreview(value: unknown): value is ChannelPreview {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.channelId === "string" &&
    value.channelId.length > 0 &&
    Array.isArray(value.items) &&
    value.items.every(isPlaylistPreviewVideo) &&
    (typeof value.updatedAt === "string" || value.updatedAt === null)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
