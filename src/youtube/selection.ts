import {
  MAX_IMPORTED_PLAYLISTS,
  MAX_SELECTED_CHANNELS,
  type ChannelShortcut,
  type PlaylistShortcut,
} from "../settings/schema";
import type { ImportedPlaylist, YouTubePlaylistFetchStatus } from "./schema";
import type {
  SubscriptionChannel,
  YouTubeSubscriptionFetchStatus,
} from "./subscriptions-schema";

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
  return filterItemsByTitle(items, query);
}

export function shouldShowChannelSelectionWorkspace(
  status: YouTubeSubscriptionFetchStatus,
  itemsCount: number
) {
  return status === "ready" && itemsCount > 0;
}

export function filterSubscribedChannels(
  items: SubscriptionChannel[],
  query: string
): SubscriptionChannel[] {
  return filterItemsByTitle(items, query);
}

export function isChannelSelected(
  selected: ChannelShortcut[],
  channelId: string
) {
  return selected.some((channel) => channel.id === channelId);
}

export function selectChannel(
  selected: ChannelShortcut[],
  channel: SubscriptionChannel
): ChannelShortcut[] {
  if (isChannelSelected(selected, channel.id)) {
    return selected;
  }

  if (selected.length >= MAX_SELECTED_CHANNELS) {
    return selected;
  }

  return [
    ...selected,
    {
      id: channel.id,
      title: channel.title,
      url: channel.url,
    },
  ];
}

export function removeChannelSelection(
  selected: ChannelShortcut[],
  channelId: string
): ChannelShortcut[] {
  return selected.filter((channel) => channel.id !== channelId);
}

export function reorderChannelSelections(
  selected: ChannelShortcut[],
  index: number,
  direction: -1 | 1
): ChannelShortcut[] {
  return reorderSelections(selected, index, direction);
}

function filterItemsByTitle<T extends { title: string }>(
  items: T[],
  query: string
): T[] {
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
  return reorderSelections(selected, index, direction);
}

function reorderSelections<T>(selected: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= selected.length) {
    return selected;
  }

  const updated = [...selected];
  [updated[index], updated[target]] = [updated[target], updated[index]];
  return updated;
}
