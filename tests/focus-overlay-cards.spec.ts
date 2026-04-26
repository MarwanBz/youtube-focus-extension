import { expect, test } from "@playwright/test";
import {
  getFocusOverlayCards,
  WATCH_LATER_URL,
} from "../content-script/src/focusOverlay";
import type { FocusSettings } from "../src/settings/schema";
import type { ImportedPlaylist } from "../src/youtube/schema";

const baseSettings: FocusSettings = {
  focusModeEnabled: true,
  disabledUntil: null,
  importedPlaylists: [],
  manualPlaylists: [],
};

test.describe("Focus overlay cards", () => {
  test("keeps Watch Later first", () => {
    const cards = getFocusOverlayCards(baseSettings, []);

    expect(cards[0]).toEqual({
      kind: "watch-later",
      source: "watch-later",
      title: "Watch Later",
      url: WATCH_LATER_URL,
      subtitle: "Opens on YouTube",
      thumbnailUrl: null,
    });
  });

  test("uses imported thumbnails and metadata when imported selections exist", () => {
    const settings: FocusSettings = {
      ...baseSettings,
      importedPlaylists: [
        {
          id: "playlist-1",
          title: "Engineering",
          url: "https://www.youtube.com/playlist?list=PL_ENGINEERING",
        },
      ],
      manualPlaylists: [
        {
          id: "playlist-2",
          title: "Travel",
          url: "https://www.youtube.com/playlist?list=PL_TRAVEL",
        },
      ],
    };
    const importedItems: ImportedPlaylist[] = [
      {
        id: "playlist-1",
        title: "Engineering Playlist",
        url: "https://www.youtube.com/playlist?list=PL_ENGINEERING",
        videoCount: 42,
        thumbnailUrl: "https://i.ytimg.com/example.jpg",
      },
    ];

    const cards = getFocusOverlayCards(settings, importedItems);

    expect(cards[1]).toEqual({
      kind: "playlist",
      source: "imported",
      title: "Engineering Playlist",
      url: "https://www.youtube.com/playlist?list=PL_ENGINEERING",
      subtitle: "42 videos",
      thumbnailUrl: "https://i.ytimg.com/example.jpg",
    });
    expect(cards).toHaveLength(2);
  });

  test("falls back to manual playlist cards when imported selections are absent", () => {
    const settings: FocusSettings = {
      ...baseSettings,
      manualPlaylists: [
        {
          id: "playlist-2",
          title: "Travel",
          url: "https://www.youtube.com/playlist?list=PL_TRAVEL",
        },
      ],
    };

    const cards = getFocusOverlayCards(settings, []);

    expect(cards[1]).toEqual({
      kind: "playlist",
      source: "manual",
      title: "Travel",
      url: "https://www.youtube.com/playlist?list=PL_TRAVEL",
      subtitle: "Playlist",
      thumbnailUrl: null,
    });
  });

  test("keeps Watch Later separate from the playlist limit", () => {
    const settings: FocusSettings = {
      ...baseSettings,
      importedPlaylists: Array.from({ length: 12 }, (_, index) => ({
        id: `playlist-${index + 1}`,
        title: `Playlist ${index + 1}`,
        url: `https://www.youtube.com/playlist?list=PL_${index + 1}`,
      })),
    };

    const cards = getFocusOverlayCards(settings, []);

    expect(cards).toHaveLength(13);
    expect(cards[0].kind).toBe("watch-later");
  });
});
