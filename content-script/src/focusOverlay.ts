import type { FocusSettings } from "@/settings/schema";
import type { ChannelPreview } from "@/youtube/channel-preview-schema";
import type { PlaylistPreview } from "@/youtube/preview-schema";
import type { ImportedPlaylist } from "@/youtube/schema";
import type { YouTubeRouteState } from "./youtubeHome";

export const WATCH_LATER_URL = "https://www.youtube.com/playlist?list=WL";
const YOUTUBE_WATCH_URL = "https://www.youtube.com/watch?v=";

export type FocusOverlaySource = {
  kind: "watch-later" | "playlist" | "channel";
  title: string;
  url: string;
};

export type FocusOverlayCard = {
  kind: "watch-later" | "playlist" | "channel";
  source: "watch-later" | "imported" | "manual" | "subscriptions";
  title: string;
  url: string;
  subtitle: string;
  thumbnailUrl: string | null;
};

export type FocusOverlaySectionItem = {
  title: string;
  url: string;
  subtitle: string;
  thumbnailUrl: string | null;
};

export type FocusOverlaySection = {
  kind: "watch-later" | "playlist" | "channel";
  source: "watch-later" | "imported" | "manual" | "subscriptions";
  title: string;
  url: string;
  items: FocusOverlaySectionItem[];
};

export type FocusOverlayHeaderContent = {
  body: string;
  buttonLabel: string;
};

const WATCH_LATER_SHORTCUT_SUBTITLE = "Opens on YouTube";
const CHANNEL_SHORTCUT_SUBTITLE = "Latest uploads";

export type FocusOverlayWheelRoute =
  | {
      kind: "page";
      delta: number;
    }
  | {
      kind: "section";
      delta: number;
    }
  | {
      kind: "ignore";
      delta: 0;
    };

export function shouldRenderHomeFocusOverlay(
  routeState: YouTubeRouteState,
  focusModeActive: boolean
) {
  return routeState.isHome && focusModeActive;
}

export function getFocusOverlayWheelRoute({
  deltaX,
  deltaY,
  shiftKey,
}: {
  deltaX: number;
  deltaY: number;
  shiftKey: boolean;
}): FocusOverlayWheelRoute {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX < 1 && absY < 1) {
    return {
      kind: "ignore",
      delta: 0,
    };
  }

  if (shiftKey) {
    return {
      kind: "section",
      delta: deltaX || deltaY,
    };
  }

  if (absX > absY) {
    return {
      kind: "section",
      delta: deltaX,
    };
  }

  return {
    kind: "page",
    delta: deltaY,
  };
}

export function getFocusOverlaySources(
  settings: FocusSettings
): FocusOverlaySource[] {
  const playlistSources =
    settings.importedPlaylists.length > 0
      ? settings.importedPlaylists
      : settings.manualPlaylists;
  const channelSources = settings.selectedChannels;

  return [
    {
      kind: "watch-later",
      title: "Watch Later",
      url: WATCH_LATER_URL,
    },
    ...playlistSources.map((playlist) => ({
      kind: "playlist" as const,
      title: playlist.title,
      url: playlist.url,
    })),
    ...channelSources.map((channel) => ({
      kind: "channel" as const,
      title: channel.title,
      url: channel.url,
    })),
  ];
}

export function getFocusOverlayHeaderContent(
  settings: FocusSettings
): FocusOverlayHeaderContent {
  const hasImportedPlaylists = settings.importedPlaylists.length > 0;
  const hasManualPlaylists = settings.manualPlaylists.length > 0;
  const hasSelectedChannels = settings.selectedChannels.length > 0;

  if (hasImportedPlaylists && hasSelectedChannels) {
    return {
      body: "Watch Later opens on YouTube, and your selected playlists plus channel uploads stay here.",
      buttonLabel: "Settings",
    };
  }

  if (hasImportedPlaylists) {
    return {
      body: "Watch Later opens on YouTube, and your selected playlists stay here.",
      buttonLabel: "Settings",
    };
  }

  if (hasManualPlaylists && hasSelectedChannels) {
    return {
      body: "Watch Later opens on YouTube alongside your saved playlist shortcuts and selected channel uploads.",
      buttonLabel: "Settings",
    };
  }

  if (hasSelectedChannels) {
    return {
      body: "Watch Later opens on YouTube alongside the latest videos from your selected channels.",
      buttonLabel: "Settings",
    };
  }

  if (hasManualPlaylists) {
    return {
      body: "Watch Later opens on YouTube alongside your saved playlist shortcuts.",
      buttonLabel: "Settings",
    };
  }

  return {
    body: "Start with Watch Later, then connect YouTube or add playlists from Settings.",
    buttonLabel: "Connect or add lists",
  };
}

export function getFocusOverlayCards(
  settings: FocusSettings,
  importedItems: ImportedPlaylist[],
  channelPreviews: ChannelPreview[] = []
): FocusOverlayCard[] {
  const importedItemsById = new Map(
    importedItems.map((playlist) => [playlist.id, playlist])
  );
  const importedItemsByUrl = new Map(
    importedItems.map((playlist) => [playlist.url, playlist])
  );
  const channelPreviewById = new Map(
    channelPreviews.map((channel) => [channel.channelId, channel])
  );

  const playlistCards =
    settings.importedPlaylists.length > 0
      ? settings.importedPlaylists.map((playlist) => {
          const importedMatch =
            importedItemsById.get(playlist.id) ||
            importedItemsByUrl.get(playlist.url) ||
            null;

          return {
            kind: "playlist" as const,
            source: "imported" as const,
            title: importedMatch?.title ?? playlist.title,
            url: importedMatch?.url ?? playlist.url,
            subtitle:
              typeof importedMatch?.videoCount === "number"
                ? `${importedMatch.videoCount} videos`
                : "Playlist",
            thumbnailUrl: importedMatch?.thumbnailUrl ?? null,
          };
        })
      : settings.manualPlaylists.map((playlist) => ({
          kind: "playlist" as const,
          source: "manual" as const,
          title: playlist.title,
          url: playlist.url,
          subtitle: "Playlist",
          thumbnailUrl: null,
        }));

  const channelCards = settings.selectedChannels.map((channel) => {
    const previewMatch = channelPreviewById.get(channel.id) ?? null;

    return {
      kind: "channel" as const,
      source: "subscriptions" as const,
      title: channel.title,
      url: channel.url,
      subtitle: CHANNEL_SHORTCUT_SUBTITLE,
      thumbnailUrl: previewMatch?.items[0]?.thumbnailUrl ?? null,
    };
  });

  return [
    {
      kind: "watch-later",
      source: "watch-later",
      title: "Watch Later",
      url: WATCH_LATER_URL,
      subtitle: WATCH_LATER_SHORTCUT_SUBTITLE,
      thumbnailUrl: null,
    },
    ...playlistCards,
    ...channelCards,
  ];
}

export function getFocusOverlaySections(
  settings: FocusSettings,
  importedItems: ImportedPlaylist[],
  previews: PlaylistPreview[],
  channelPreviews: ChannelPreview[] = []
): FocusOverlaySection[] {
  const importedItemsById = new Map(
    importedItems.map((playlist) => [playlist.id, playlist])
  );
  const previewByPlaylistId = new Map(
    previews.map((playlist) => [playlist.playlistId, playlist])
  );
  const previewByChannelId = new Map(
    channelPreviews.map((channel) => [channel.channelId, channel])
  );

  const playlistSections =
    settings.importedPlaylists.length > 0
      ? settings.importedPlaylists.map((playlist) => {
          const importedMatch = importedItemsById.get(playlist.id) ?? null;
          const previewMatch = previewByPlaylistId.get(playlist.id) ?? null;

          return {
            kind: "playlist" as const,
            source: "imported" as const,
            title: importedMatch?.title ?? playlist.title,
            url: importedMatch?.url ?? playlist.url,
            items:
              previewMatch && previewMatch.items.length > 0
                ? previewMatch.items.map((item) => ({
                    title: item.title,
                    url: `${YOUTUBE_WATCH_URL}${item.videoId}`,
                    subtitle: item.channelTitle ?? "Video",
                    thumbnailUrl: item.thumbnailUrl,
                  }))
                : [
                    {
                      title: importedMatch?.title ?? playlist.title,
                      url: importedMatch?.url ?? playlist.url,
                      subtitle:
                        typeof importedMatch?.videoCount === "number"
                          ? `${importedMatch.videoCount} videos`
                          : "Playlist",
                      thumbnailUrl: importedMatch?.thumbnailUrl ?? null,
                    },
                  ],
          };
        })
      : settings.manualPlaylists.map((playlist) => ({
          kind: "playlist" as const,
          source: "manual" as const,
          title: playlist.title,
          url: playlist.url,
          items: [
            {
              title: playlist.title,
              url: playlist.url,
              subtitle: "Playlist",
              thumbnailUrl: null,
            },
          ],
        }));

  const channelSections = settings.selectedChannels.map((channel) => {
    const previewMatch = previewByChannelId.get(channel.id) ?? null;

    return {
      kind: "channel" as const,
      source: "subscriptions" as const,
      title: channel.title,
      url: channel.url,
      items:
        previewMatch && previewMatch.items.length > 0
          ? previewMatch.items.map((item) => ({
              title: item.title,
              url: `${YOUTUBE_WATCH_URL}${item.videoId}`,
              subtitle: item.channelTitle ?? channel.title,
              thumbnailUrl: item.thumbnailUrl,
            }))
          : [
              {
                title: channel.title,
                url: channel.url,
                subtitle: CHANNEL_SHORTCUT_SUBTITLE,
                thumbnailUrl: null,
              },
            ],
    };
  });

  return [
    {
      kind: "watch-later",
      source: "watch-later",
      title: "Watch Later",
      url: WATCH_LATER_URL,
      items: [
        {
          title: "Watch Later",
          url: WATCH_LATER_URL,
          subtitle: WATCH_LATER_SHORTCUT_SUBTITLE,
          thumbnailUrl: null,
        },
      ],
    },
    ...playlistSections,
    ...channelSections,
  ];
}
