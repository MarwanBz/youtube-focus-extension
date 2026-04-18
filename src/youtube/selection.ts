import {
  MAX_IMPORTED_PLAYLISTS,
  type PlaylistShortcut,
} from "../settings/schema";
import type { ImportedPlaylist, YouTubePlaylistFetchStatus } from "./schema";

export function shouldShowImportedSelectionWorkspace(
  status: YouTubePlaylistFetchStatus,
  itemsCount: number
) {
  return status === "ready" && itemsCount > 0;
}

export function filterImportedPlaylists(
  items: ImportedPlaylist[],
  query: string
): ImportedPlaylist[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) =>
    item.title.toLowerCase().includes(normalizedQuery)
  );
}

export function isImportedPlaylistSelected(
  selected: PlaylistShortcut[],
  playlistId: string
) {
  return selected.some((playlist) => playlist.id === playlistId);
}

export function selectImportedPlaylist(
  selected: PlaylistShortcut[],
  playlist: ImportedPlaylist
): PlaylistShortcut[] {
  if (isImportedPlaylistSelected(selected, playlist.id)) {
    return selected;
  }

  if (selected.length >= MAX_IMPORTED_PLAYLISTS) {
    return selected;
  }

  return [
    ...selected,
    {
      id: playlist.id,
      title: playlist.title,
      url: playlist.url,
    },
  ];
}

export function removeImportedPlaylistSelection(
  selected: PlaylistShortcut[],
  playlistId: string
): PlaylistShortcut[] {
  return selected.filter((playlist) => playlist.id !== playlistId);
}

export function reorderImportedPlaylistSelections(
  selected: PlaylistShortcut[],
  index: number,
  direction: -1 | 1
): PlaylistShortcut[] {
  const target = index + direction;
  if (target < 0 || target >= selected.length) {
    return selected;
  }

  const updated = [...selected];
  [updated[index], updated[target]] = [updated[target], updated[index]];
  return updated;
}
