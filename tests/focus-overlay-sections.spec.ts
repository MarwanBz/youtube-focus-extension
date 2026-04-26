import { expect, test } from "@playwright/test";
import {
  getFocusOverlayHeaderContent,
  getFocusOverlaySections,
} from "../content-script/src/focusOverlay";
import type { PlaylistPreview } from "../src/youtube/preview-schema";
import type { FocusSettings } from "../src/settings/schema";
import type { ImportedPlaylist } from "../src/youtube/schema";

const baseSettings: FocusSettings = {
  focusModeEnabled: true,
  disabledUntil: null,
  importedPlaylists: [],
  manualPlaylists: [],
};

test.describe("Focus overlay sections", () => {
  test("shows select-lists copy when no playlists are configured", () => {
    expect(getFocusOverlayHeaderContent(baseSettings, false)).toEqual({
      body: "Start with Watch Later, then connect YouTube or add playlists from Settings.",
      buttonLabel: "Connect or add lists",
    });
  });

  test("keeps settings copy when manual playlists exist", () => {
    const settings: FocusSettings = {
      ...baseSettings,
      manualPlaylists: [
        {
          id: "manual-1",
          title: "Documentaries",
          url: "https://www.youtube.com/playlist?list=PL_DOCS",
        },
      ],
    };

    expect(getFocusOverlayHeaderContent(settings, true)).toEqual({
      body: "Watch Later opens on YouTube alongside your saved playlist shortcuts.",
      buttonLabel: "Settings",
    });
  });

  test("clarifies Watch Later behavior when imported playlists exist", () => {
    const settings: FocusSettings = {
      ...baseSettings,
      importedPlaylists: [
        {
          id: "playlist-1",
          title: "Engineering",
          url: "https://www.youtube.com/playlist?list=PL_ENGINEERING",
        },
      ],
    };

    expect(getFocusOverlayHeaderContent(settings, true)).toEqual({
      body: "Watch Later opens on YouTube, and your selected playlists stay here.",
      buttonLabel: "Settings",
    });
  });

  test("builds playlist shelves from selected imported playlist previews", () => {
    const settings: FocusSettings = {
      ...baseSettings,
      importedPlaylists: [
        {
          id: "playlist-1",
          title: "Engineering",
          url: "https://www.youtube.com/playlist?list=PL_ENGINEERING",
        },
      ],
    };
    const importedItems: ImportedPlaylist[] = [
      {
        id: "playlist-1",
        title: "Engineering Playlist",
        url: "https://www.youtube.com/playlist?list=PL_ENGINEERING",
        videoCount: 42,
        thumbnailUrl: "https://i.ytimg.com/playlist.jpg",
      },
    ];
    const previews: PlaylistPreview[] = [
      {
        playlistId: "playlist-1",
        updatedAt: "2026-04-18T00:00:00.000Z",
        items: [
          {
            videoId: "video-1",
            title: "System Design Interview",
            thumbnailUrl: "https://i.ytimg.com/video-1.jpg",
            channelTitle: "Engineering Insights",
          },
        ],
      },
    ];

    const sections = getFocusOverlaySections(settings, importedItems, previews);

    expect(sections[1]).toEqual({
      kind: "playlist",
      source: "imported",
      title: "Engineering Playlist",
      url: "https://www.youtube.com/playlist?list=PL_ENGINEERING",
      items: [
        {
          title: "System Design Interview",
          url: "https://www.youtube.com/watch?v=video-1",
          subtitle: "Engineering Insights",
          thumbnailUrl: "https://i.ytimg.com/video-1.jpg",
        },
      ],
    });
  });

  test("falls back to manual playlist section when imported selections are absent", () => {
    const settings: FocusSettings = {
      ...baseSettings,
      manualPlaylists: [
        {
          id: "manual-1",
          title: "Documentaries",
          url: "https://www.youtube.com/playlist?list=PL_DOCS",
        },
      ],
    };

    const sections = getFocusOverlaySections(settings, [], []);

    expect(sections[1]).toEqual({
      kind: "playlist",
      source: "manual",
      title: "Documentaries",
      url: "https://www.youtube.com/playlist?list=PL_DOCS",
      items: [
        {
          title: "Documentaries",
          url: "https://www.youtube.com/playlist?list=PL_DOCS",
          subtitle: "Playlist",
          thumbnailUrl: null,
        },
      ],
    });
  });

  test("keeps Watch Later visible when no playlists are configured", () => {
    const sections = getFocusOverlaySections(baseSettings, [], []);

    expect(sections[0]).toEqual({
      kind: "watch-later",
      source: "watch-later",
      title: "Watch Later",
      url: "https://www.youtube.com/playlist?list=WL",
      items: [
        {
          title: "Watch Later",
          url: "https://www.youtube.com/playlist?list=WL",
          subtitle: "Opens on YouTube",
          thumbnailUrl: null,
        },
      ],
    });
  });
});
