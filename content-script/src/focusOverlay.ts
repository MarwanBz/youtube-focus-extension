import type { FocusSettings } from "@/settings/schema";
import type { PlaylistPreview } from "@/youtube/preview-schema";
import type { ImportedPlaylist } from "@/youtube/schema";
import type { YouTubeRouteState } from "./youtubeHome";

export const WATCH_LATER_URL = "https://www.youtube.com/playlist?list=WL";
const YOUTUBE_WATCH_URL = "https://www.youtube.com/watch?v=";

export type FocusOverlaySource = {
  kind: "watch-later" | "playlist";
  title: string;
  url: string;
};

export type FocusOverlayCard = {
  kind: "watch-later" | "playlist";
  source: "watch-later" | "imported" | "manual";
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
  kind: "watch-later" | "playlist";
  source: "watch-later" | "imported" | "manual";
  title: string;
  url: string;
  items: FocusOverlaySectionItem[];
};

export type FocusOverlayHeaderContent = {
  body: string;
  buttonLabel: string;
};

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
  ];
}

export function getFocusOverlayHeaderContent(
  settings: FocusSettings,
  hasPlaylistSections: boolean
): FocusOverlayHeaderContent {
  if (settings.importedPlaylists.length > 0) {
    return {
      body: "Showing Watch Later and your selected playlists.",
      buttonLabel: "Settings",
    };
  }

  if (hasPlaylistSections) {
    return {
      body: "Showing Watch Later and your saved manual playlist shortcuts.",
      buttonLabel: "Settings",
    };
  }

  return {
    body: "Select lists from Settings to build your queue.",
    buttonLabel: "Select lists",
  };
}

export function getFocusOverlayCards(
  settings: FocusSettings,
  importedItems: ImportedPlaylist[]
): FocusOverlayCard[] {
  const importedItemsById = new Map(
    importedItems.map((playlist) => [playlist.id, playlist])
  );
  const importedItemsByUrl = new Map(
    importedItems.map((playlist) => [playlist.url, playlist])
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

  return [
    {
      kind: "watch-later",
      source: "watch-later",
      title: "Watch Later",
      url: WATCH_LATER_URL,
      subtitle: "Saved videos",
      thumbnailUrl: null,
    },
    ...playlistCards,
  ];
}

export function getFocusOverlaySections(
  settings: FocusSettings,
  importedItems: ImportedPlaylist[],
  previews: PlaylistPreview[]
): FocusOverlaySection[] {
  const importedItemsById = new Map(
    importedItems.map((playlist) => [playlist.id, playlist])
  );
  const previewByPlaylistId = new Map(
    previews.map((playlist) => [playlist.playlistId, playlist])
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
          subtitle: "Saved videos",
          thumbnailUrl: null,
        },
      ],
    },
    ...playlistSections,
  ];
}
