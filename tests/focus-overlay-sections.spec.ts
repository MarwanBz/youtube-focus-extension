import { expect, test } from "@playwright/test";
import { getFocusOverlaySections } from "../content-script/src/focusOverlay";
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
});
