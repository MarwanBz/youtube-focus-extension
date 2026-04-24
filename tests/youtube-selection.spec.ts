import { expect, test } from "@playwright/test";
import { MAX_IMPORTED_PLAYLISTS } from "../src/settings/schema";
import {
  filterImportedPlaylists,
  removeImportedPlaylistSelection,
  reorderImportedPlaylistSelections,
  selectImportedPlaylist,
  shouldShowImportedSelectionWorkspace,
} from "../src/youtube/selection";
import type { ImportedPlaylist } from "../src/youtube/schema";

const importedPlaylists: ImportedPlaylist[] = [
  {
    id: "pl-1",
    title: "Engineering Focus",
    url: "https://www.youtube.com/playlist?list=PL_1",
    videoCount: 10,
    thumbnailUrl: null,
  },
  {
    id: "pl-2",
    title: "Travel Notes",
    url: "https://www.youtube.com/playlist?list=PL_2",
    videoCount: 8,
    thumbnailUrl: null,
  },
  {
    id: "pl-3",
    title: "Startup Lessons",
    url: "https://www.youtube.com/playlist?list=PL_3",
    videoCount: 12,
    thumbnailUrl: null,
  },
  {
    id: "pl-4",
    title: "System Design",
    url: "https://www.youtube.com/playlist?list=PL_4",
    videoCount: 6,
    thumbnailUrl: null,
  },
];

test.describe("youtube imported playlist selection helpers", () => {
  test("shows selection workspace only when imported data is ready", () => {
    expect(shouldShowImportedSelectionWorkspace("ready", 1)).toBe(true);
    expect(shouldShowImportedSelectionWorkspace("ready", 0)).toBe(false);
    expect(shouldShowImportedSelectionWorkspace("loading", 4)).toBe(false);
    expect(shouldShowImportedSelectionWorkspace("unauthorized", 4)).toBe(
      false
    );
  });

  test("filters imported playlists by search query", () => {
    expect(filterImportedPlaylists(importedPlaylists, "travel")).toEqual([
      importedPlaylists[1],
    ]);
  });

  test("enforces max selected imported playlists", () => {
    const manyPlaylists: ImportedPlaylist[] = Array.from(
      { length: MAX_IMPORTED_PLAYLISTS + 1 },
      (_, index) => ({
        id: `pl-${index + 1}`,
        title: `Playlist ${index + 1}`,
        url: `https://www.youtube.com/playlist?list=PL_${index + 1}`,
        videoCount: index + 1,
        thumbnailUrl: null,
      })
    );

    const selected = manyPlaylists.reduce((current, playlist) => {
      return selectImportedPlaylist(current, playlist);
    }, [] as { id: string; title: string; url: string }[]);

    expect(selected).toHaveLength(MAX_IMPORTED_PLAYLISTS);
    expect(selected.map((playlist) => playlist.id)).toEqual(
      manyPlaylists.slice(0, MAX_IMPORTED_PLAYLISTS).map((playlist) => playlist.id)
    );
  });

  test("reorders and removes selected playlists", () => {
    const selected = [
      {
        id: "pl-1",
        title: "Engineering Focus",
        url: "https://www.youtube.com/playlist?list=PL_1",
      },
      {
        id: "pl-2",
        title: "Travel Notes",
        url: "https://www.youtube.com/playlist?list=PL_2",
      },
    ];

    const moved = reorderImportedPlaylistSelections(selected, 1, -1);
    expect(moved.map((playlist) => playlist.id)).toEqual(["pl-2", "pl-1"]);

    const removed = removeImportedPlaylistSelection(moved, "pl-2");
    expect(removed.map((playlist) => playlist.id)).toEqual(["pl-1"]);
  });
});
