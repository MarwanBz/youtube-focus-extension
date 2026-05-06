import {
  StrictMode,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";

import "@lib/styles/globals.css";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  connectYouTubeFromUi,
  disconnectYouTube,
  getAuthChipText,
  getAuthInlineMessage,
  getAuthPrimaryAction,
  requestYouTubePlaylistFetch,
  skipYouTubeAuth,
} from "./auth/client";
import {
  DEFAULT_YOUTUBE_AUTH_STATE,
  type YouTubeAuthState,
} from "./auth/schema";
import { subscribeToYouTubeAuthState } from "./auth/storage";
import { DEFAULT_FOCUS_SETTINGS } from "./settings/defaults";
import {
  createTemporaryDisableUntilIso,
  getTemporaryDisableUiState,
  TEMPORARY_DISABLE_PRESET_MINUTES,
  type TemporaryDisablePresetMinutes,
} from "./settings/temporary-disable";
import {
  patchFocusSettings,
  subscribeToFocusSettings,
} from "./settings/storage";
import { useTemporaryDisableNow } from "./settings/useTemporaryDisableNow";
import {
  isYouTubePlaylistUrl,
  MAX_IMPORTED_PLAYLISTS,
  MAX_MANUAL_PLAYLISTS,
  MAX_SELECTED_CHANNELS,
} from "./settings/schema";
import type { FocusSettings, PlaylistShortcut } from "./settings/schema";
import {
  DEFAULT_YOUTUBE_PLAYLIST_STATE,
  type YouTubePlaylistState,
} from "./youtube/schema";
import { subscribeToYouTubePlaylistState } from "./youtube/storage";
import { getPlaylistStatusCopy } from "./youtube/status-copy";
import {
  DEFAULT_YOUTUBE_SUBSCRIPTION_STATE,
  type YouTubeSubscriptionState,
} from "./youtube/subscriptions-schema";
import { subscribeToYouTubeSubscriptionState } from "./youtube/subscriptions-storage";
import { getSubscriptionStatusCopy } from "./youtube/subscriptions-status-copy";
import {
  filterSubscribedChannels,
  isChannelSelected,
  filterImportedPlaylists,
  removeChannelSelection,
  isImportedPlaylistSelected,
  removeImportedPlaylistSelection,
  reorderChannelSelections,
  reorderImportedPlaylistSelections,
  selectChannel,
  selectImportedPlaylist,
  shouldShowChannelSelectionWorkspace,
  shouldShowImportedSelectionWorkspace,
} from "./youtube/selection";

const manifest =
  typeof chrome !== "undefined" && chrome.runtime?.getManifest
    ? chrome.runtime.getManifest()
    : null;
const extensionVersion = manifest?.version ?? "0.0.0";

function getAuthBadgeVariant(youtubeAuth: YouTubeAuthState) {
  if (youtubeAuth.connected) {
    return "success" as const;
  }

  if (youtubeAuth.uiState === "failed") {
    return "danger" as const;
  }

  if (
    youtubeAuth.uiState === "cancelled" ||
    youtubeAuth.uiState === "skipped"
  ) {
    return "warning" as const;
  }

  return "secondary" as const;
}

function getPlaylistTone(
  tone: "neutral" | "warning" | "error" | null | undefined
) {
  if (tone === "error") {
    return "text-destructive";
  }

  if (tone === "warning") {
    return "text-amber-400";
  }

  return "text-muted-foreground";
}

function StatusMessage({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "error" | "warning";
}) {
  return (
    <p className={`text-xs leading-relaxed ${getPlaylistTone(tone)}`}>
      {children}
    </p>
  );
}

type ReorderRowProps = {
  description: string;
  disableMoveDown: boolean;
  disableMoveUp: boolean;
  title: string;
  onEdit?: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
};

function ReorderRow({
  description,
  disableMoveDown,
  disableMoveUp,
  title,
  onEdit,
  onMoveDown,
  onMoveUp,
  onRemove,
}: ReorderRowProps) {
  return (
    <div className="group flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:border-border hover:bg-secondary/20">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          aria-label="Move up"
          disabled={disableMoveUp}
          size="sm"
          variant="ghost"
          onClick={onMoveUp}
        >
          &#x2191;
        </Button>
        <Button
          aria-label="Move down"
          disabled={disableMoveDown}
          size="sm"
          variant="ghost"
          onClick={onMoveDown}
        >
          &#x2193;
        </Button>
        {onEdit ? (
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Edit
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="text-destructive hover:text-destructive"
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

export function OptionsApp() {
  const [settings, setSettings] = useState<FocusSettings>(
    DEFAULT_FOCUS_SETTINGS
  );
  const [youtubeAuth, setYouTubeAuth] = useState<YouTubeAuthState>(
    DEFAULT_YOUTUBE_AUTH_STATE
  );
  const [status, setStatus] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [playlistState, setPlaylistState] = useState<YouTubePlaylistState>(
    DEFAULT_YOUTUBE_PLAYLIST_STATE
  );
  const [subscriptionState, setSubscriptionState] =
    useState<YouTubeSubscriptionState>(DEFAULT_YOUTUBE_SUBSCRIPTION_STATE);
  const [playlistStatus, setPlaylistStatus] = useState("");
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [importedSearch, setImportedSearch] = useState("");
  const [channelSearch, setChannelSearch] = useState("");
  const [channelStatus, setChannelStatus] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const now = useTemporaryDisableNow(settings.disabledUntil);

  useEffect(() => subscribeToFocusSettings(setSettings), []);
  useEffect(() => subscribeToYouTubeAuthState(setYouTubeAuth), []);
  useEffect(() => subscribeToYouTubePlaylistState(setPlaylistState), []);
  useEffect(() => subscribeToYouTubeSubscriptionState(setSubscriptionState), []);

  const playlists = settings.manualPlaylists;
  const selectedImportedPlaylists = settings.importedPlaylists;
  const selectedChannels = settings.selectedChannels;
  const atMax = playlists.length >= MAX_MANUAL_PLAYLISTS;
  const playlistStatusCopy = getPlaylistStatusCopy(
    playlistState.status,
    playlistState.lastError
  );
  const subscriptionStatusCopy = getSubscriptionStatusCopy(
    subscriptionState.status,
    subscriptionState.lastError
  );
  const filteredImportedPlaylists = useMemo(
    () => filterImportedPlaylists(playlistState.items, importedSearch),
    [importedSearch, playlistState.items]
  );
  const filteredChannels = useMemo(
    () => filterSubscribedChannels(subscriptionState.items, channelSearch),
    [channelSearch, subscriptionState.items]
  );
  const temporaryDisableUi = getTemporaryDisableUiState(settings, { now });

  const handleFocusDefaultChange = (checked: boolean) => {
    setStatus("Saving...");
    void patchFocusSettings({
      focusModeEnabled: checked,
      disabledUntil: null,
    })
      .then(() => setStatus("Settings saved."))
      .catch(() => setStatus("Unable to save settings."));
  };

  const handleTemporaryDisable = (minutes: TemporaryDisablePresetMinutes) => {
    setStatus("Saving...");
    void patchFocusSettings({
      focusModeEnabled: true,
      disabledUntil: createTemporaryDisableUntilIso(minutes),
    })
      .then(() => setStatus(`Focus Mode paused for ${minutes} minutes.`))
      .catch(() => setStatus("Unable to pause Focus Mode."));
  };

  const handleResumeFocus = () => {
    setStatus("Saving...");
    void patchFocusSettings({ disabledUntil: null })
      .then(() => setStatus("Focus Mode resumed."))
      .catch(() => setStatus("Unable to resume Focus Mode."));
  };

  const handleAddPlaylist = (event: FormEvent) => {
    event.preventDefault();
    const title = newTitle.trim();
    const url = newUrl.trim();

    if (!title) {
      setAddError("Title is required.");
      return;
    }
    if (!isYouTubePlaylistUrl(url)) {
      setAddError(
        "Enter a valid YouTube playlist URL (https://www.youtube.com/playlist?list=...)."
      );
      return;
    }
    if (atMax) {
      setAddError(`Maximum ${MAX_MANUAL_PLAYLISTS} playlists allowed.`);
      return;
    }

    const entry: PlaylistShortcut = {
      id: crypto.randomUUID(),
      title,
      url,
    };

    setStatus("Saving...");
    void patchFocusSettings({ manualPlaylists: [...playlists, entry] })
      .then(() => {
        setNewTitle("");
        setNewUrl("");
        setAddError(null);
        setStatus("Playlist added.");
      })
      .catch(() => setStatus("Unable to save playlist."));
  };

  const handleRemovePlaylist = (id: string) => {
    const updated = playlists.filter((playlist) => playlist.id !== id);
    setStatus("Saving...");
    void patchFocusSettings({ manualPlaylists: updated })
      .then(() => setStatus("Playlist removed."))
      .catch(() => setStatus("Unable to remove playlist."));
  };

  const handleMovePlaylist = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= playlists.length) {
      return;
    }

    const updated = [...playlists];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setStatus("Saving...");
    void patchFocusSettings({ manualPlaylists: updated })
      .then(() => setStatus("Order updated."))
      .catch(() => setStatus("Unable to reorder playlists."));
  };

  const handleStartEdit = (playlist: PlaylistShortcut) => {
    setEditingId(playlist.id);
    setEditTitle(playlist.title);
    setEditUrl(playlist.url);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditUrl("");
    setEditError(null);
  };

  const handleSaveEdit = () => {
    const title = editTitle.trim();
    const url = editUrl.trim();

    if (!title) {
      setEditError("Title is required.");
      return;
    }
    if (!isYouTubePlaylistUrl(url)) {
      setEditError(
        "Enter a valid YouTube playlist URL (https://www.youtube.com/playlist?list=...)."
      );
      return;
    }

    const updated = playlists.map((playlist) =>
      playlist.id === editingId ? { ...playlist, title, url } : playlist
    );
    setStatus("Saving...");
    void patchFocusSettings({ manualPlaylists: updated })
      .then(() => {
        handleCancelEdit();
        setStatus("Playlist updated.");
      })
      .catch(() => setStatus("Unable to save changes."));
  };

  const handleConnectYouTube = () => {
    if (authLoading) {
      return;
    }

    setAuthLoading(true);
    setAuthStatus("");

    void connectYouTubeFromUi().then((response) => {
      setAuthLoading(false);
      if (!response.ok) {
        setAuthStatus(response.message);
        return;
      }

      if (response.result.ok) {
        setAuthStatus(
          "YouTube connected. Loading playlists and subscribed channels now..."
        );
        return;
      }

      if (response.result.status === "cancelled") {
        setAuthStatus("YouTube sign-in was cancelled. You can retry any time.");
        return;
      }

      setAuthStatus(response.result.message);
    });
  };

  const handleSkipAuth = () => {
    if (authLoading) {
      return;
    }

    setAuthStatus("");
    void skipYouTubeAuth()
      .then(() =>
        setAuthStatus(
          "You skipped YouTube auth for now. Watch Later still works, and you can add manual playlist URLs below."
        )
      )
      .catch(() => setAuthStatus("Unable to update auth status right now."));
  };

  const handleDisconnectYouTube = () => {
    if (authLoading) {
      return;
    }

    setAuthStatus("");
    void disconnectYouTube().then(() => {
      setAuthStatus("Account removed. Reconnect to import playlists and channels.");
    });
  };

  const handleRefreshImportedPlaylists = () => {
    if (playlistLoading) {
      return;
    }

    setPlaylistLoading(true);
    setPlaylistStatus("");
    void requestYouTubePlaylistFetch().then((result) => {
      setPlaylistLoading(false);
      if (result.ok) {
        setPlaylistStatus(
          result.status === "empty"
            ? "Connected but no playlists were returned."
            : "Imported playlists updated."
        );
        return;
      }

      if (result.status === "not_connected") {
        setPlaylistStatus("Connect or reconnect YouTube to import playlists.");
        return;
      }

      setPlaylistStatus(result.message);
    });
  };

  const handleSelectImportedPlaylist = (playlistId: string) => {
    const playlist = playlistState.items.find((item) => item.id === playlistId);
    if (!playlist) {
      return;
    }

    const nextSelection = selectImportedPlaylist(
      selectedImportedPlaylists,
      playlist
    );
    if (nextSelection === selectedImportedPlaylists) {
      setPlaylistStatus(
        selectedImportedPlaylists.length >= MAX_IMPORTED_PLAYLISTS
          ? `Select up to ${MAX_IMPORTED_PLAYLISTS} playlists for Focus Home.`
          : "Playlist is already selected."
      );
      return;
    }

    setPlaylistStatus("");
    void patchFocusSettings({ importedPlaylists: nextSelection }).catch(() =>
      setPlaylistStatus("Unable to save selected playlists.")
    );
  };

  const handleRemoveImportedPlaylist = (playlistId: string) => {
    const nextSelection = removeImportedPlaylistSelection(
      selectedImportedPlaylists,
      playlistId
    );
    setPlaylistStatus("");
    void patchFocusSettings({ importedPlaylists: nextSelection }).catch(() =>
      setPlaylistStatus("Unable to save selected playlists.")
    );
  };

  const handleMoveImportedPlaylist = (index: number, direction: -1 | 1) => {
    const nextSelection = reorderImportedPlaylistSelections(
      selectedImportedPlaylists,
      index,
      direction
    );
    if (nextSelection === selectedImportedPlaylists) {
      return;
    }

    setPlaylistStatus("");
    void patchFocusSettings({ importedPlaylists: nextSelection }).catch(() =>
      setPlaylistStatus("Unable to reorder selected playlists.")
    );
  };

  const handleSelectChannel = (channelId: string) => {
    const channel = subscriptionState.items.find((item) => item.id === channelId);
    if (!channel) {
      return;
    }

    const nextSelection = selectChannel(selectedChannels, channel);
    if (nextSelection === selectedChannels) {
      setChannelStatus(
        selectedChannels.length >= MAX_SELECTED_CHANNELS
          ? `Select up to ${MAX_SELECTED_CHANNELS} channels for Focus Home.`
          : "Channel is already selected."
      );
      return;
    }

    setChannelStatus("");
    void patchFocusSettings({ selectedChannels: nextSelection }).catch(() =>
      setChannelStatus("Unable to save selected channels.")
    );
  };

  const handleRemoveChannel = (channelId: string) => {
    const nextSelection = removeChannelSelection(selectedChannels, channelId);
    setChannelStatus("");
    void patchFocusSettings({ selectedChannels: nextSelection }).catch(() =>
      setChannelStatus("Unable to save selected channels.")
    );
  };

  const handleMoveChannel = (index: number, direction: -1 | 1) => {
    const nextSelection = reorderChannelSelections(
      selectedChannels,
      index,
      direction
    );
    if (nextSelection === selectedChannels) {
      return;
    }

    setChannelStatus("");
    void patchFocusSettings({ selectedChannels: nextSelection }).catch(() =>
      setChannelStatus("Unable to reorder selected channels.")
    );
  };

  return (
    <main className="min-h-screen bg-background antialiased text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage your Focus Home preferences
          </p>
        </header>

        <div className="space-y-8">
          {/* ── YouTube Account ── */}
          <Card className="border-primary/10 bg-card/95 shadow-[0_4px_24px_rgba(255,78,69,0.04)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_8px_32px_rgba(255,78,69,0.08)]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle>YouTube Account</CardTitle>
                  <CardDescription>
                    Connect to import playlists and subscribed channels for Focus Home
                  </CardDescription>
                </div>
                <Badge variant={getAuthBadgeVariant(youtubeAuth)}>
                  {getAuthChipText(youtubeAuth)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleConnectYouTube}
                  disabled={authLoading}
                >
                  {authLoading
                    ? "Connecting..."
                    : getAuthPrimaryAction(youtubeAuth)}
                </Button>
                {!youtubeAuth.connected ? (
                  <Button
                    variant="ghost"
                    disabled={authLoading}
                    onClick={handleSkipAuth}
                  >
                    Skip for now
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    disabled={authLoading}
                    onClick={handleDisconnectYouTube}
                    className="text-destructive hover:text-destructive"
                  >
                    Remove account
                  </Button>
                )}
              </div>

              {getAuthInlineMessage(youtubeAuth) ? (
                <StatusMessage>{getAuthInlineMessage(youtubeAuth)}</StatusMessage>
              ) : null}

              {authStatus ? (
                <StatusMessage>{authStatus}</StatusMessage>
              ) : null}
              {youtubeAuth.lastError &&
              !authStatus &&
              youtubeAuth.uiState === "failed" ? (
                <StatusMessage tone="error">
                  {youtubeAuth.lastError}
                </StatusMessage>
              ) : null}
            </CardContent>
          </Card>

          {/* ── Imported Playlists ── */}
          <Card className="border-primary/10 bg-card/95 shadow-[0_4px_24px_rgba(255,78,69,0.04)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_8px_32px_rgba(255,78,69,0.08)]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle>Imported Playlists</CardTitle>
                  <CardDescription>
                    Select from your YouTube library. Watch Later stays a direct YouTube shortcut in Focus Home.
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {playlistState.status === "ready" ? (
                    <Badge variant="outline">
                      {playlistState.items.length} playlists
                    </Badge>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshImportedPlaylists}
                    disabled={playlistLoading || !youtubeAuth.connected}
                  >
                    {playlistLoading ? "Refreshing\u2026" : "Refresh"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!youtubeAuth.connected ? (
                <StatusMessage tone="warning">
                  Connect YouTube to import playlists. Watch Later still opens directly on YouTube, and manual shortcuts stay available below.
                </StatusMessage>
              ) : null}
              {playlistStatusCopy ? (
                <StatusMessage tone={playlistStatusCopy.tone}>
                  {playlistStatusCopy.text}
                </StatusMessage>
              ) : null}
              {playlistStatus ? (
                <StatusMessage>{playlistStatus}</StatusMessage>
              ) : null}

              {playlistState.status === "loading" ? (
                <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/10 px-4 py-6">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">
                    Loading playlists...
                  </p>
                </div>
              ) : null}

              {shouldShowImportedSelectionWorkspace(
                playlistState.status,
                playlistState.items.length
              ) ? (
                <div className="space-y-4">
                  {/* Selected playlists */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Selected ({selectedImportedPlaylists.length}/
                      {MAX_IMPORTED_PLAYLISTS})
                    </Label>

                    {selectedImportedPlaylists.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">
                        No playlists selected. Choose from below.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedImportedPlaylists.map((playlist, index) => (
                          <div
                            key={`selected-${playlist.id}`}
                            className="group flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {playlist.title}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {playlist.url}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleMoveImportedPlaylist(index, -1)
                                }
                                disabled={index === 0}
                                aria-label="Move up"
                              >
                                &#x2191;
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleMoveImportedPlaylist(index, 1)
                                }
                                disabled={
                                  index ===
                                  selectedImportedPlaylists.length - 1
                                }
                                aria-label="Move down"
                              >
                                &#x2193;
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleRemoveImportedPlaylist(playlist.id)
                                }
                                className="text-destructive hover:text-destructive"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Search + Available playlists */}
                  <div className="space-y-3">
                    <Input
                      id="imported-playlist-search"
                      placeholder="Search playlists..."
                      type="text"
                      value={importedSearch}
                      onChange={(
                        event: ChangeEvent<HTMLInputElement>
                      ) => setImportedSearch(event.target.value)}
                    />

                    <ScrollArea className="max-h-[28rem]">
                      <div className="space-y-1.5 pr-3">
                        {filteredImportedPlaylists.map((playlist) => {
                          const selected = isImportedPlaylistSelected(
                            selectedImportedPlaylists,
                            playlist.id
                          );
                          const selectDisabled =
                            !selected &&
                            selectedImportedPlaylists.length >=
                              MAX_IMPORTED_PLAYLISTS;

                          return (
                            <div
                              key={playlist.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:border-border hover:bg-secondary/20"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {playlist.title}
                                </p>
                                <Badge
                                  variant="outline"
                                  className="mt-1 text-[10px]"
                                >
                                  {playlist.videoCount === null
                                    ? "Unknown"
                                    : `${playlist.videoCount} videos`}
                                </Badge>
                              </div>
                              {selected ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    handleRemoveImportedPlaylist(playlist.id)
                                  }
                                >
                                  Selected
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  disabled={selectDisabled}
                                  onClick={() =>
                                    handleSelectImportedPlaylist(playlist.id)
                                  }
                                >
                                  Select
                                </Button>
                              )}
                            </div>
                          );
                        })}
                        {filteredImportedPlaylists.length === 0 ? (
                          <p className="py-4 text-center text-sm text-muted-foreground">
                            No playlists match your search
                          </p>
                        ) : null}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* ── Channels ── */}
          <Card className="border-primary/10 bg-card/95 shadow-[0_4px_24px_rgba(255,78,69,0.04)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_8px_32px_rgba(255,78,69,0.08)]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle>Channels</CardTitle>
                  <CardDescription>
                    Add up to {MAX_SELECTED_CHANNELS} subscribed channels. Their latest videos appear after playlist shelves in Focus Home.
                  </CardDescription>
                </div>
                {subscriptionState.status === "ready" ? (
                  <Badge variant="outline">
                    {subscriptionState.items.length} channels
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!youtubeAuth.connected ? (
                <div className="space-y-3 rounded-lg border border-border/50 bg-secondary/10 px-4 py-4">
                  <StatusMessage tone="warning">
                    Connect YouTube to browse your subscribed channels and add their latest uploads to Focus Home.
                  </StatusMessage>
                  <div>
                    <Button onClick={handleConnectYouTube} disabled={authLoading}>
                      {authLoading ? "Connecting..." : getAuthPrimaryAction(youtubeAuth)}
                    </Button>
                  </div>
                </div>
              ) : null}

              {subscriptionStatusCopy ? (
                <StatusMessage tone={subscriptionStatusCopy.tone}>
                  {subscriptionStatusCopy.text}
                </StatusMessage>
              ) : null}
              {channelStatus ? (
                <StatusMessage>{channelStatus}</StatusMessage>
              ) : null}

              {subscriptionState.status === "loading" ? (
                <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/10 px-4 py-6">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">
                    Loading subscribed channels...
                  </p>
                </div>
              ) : null}

              {shouldShowChannelSelectionWorkspace(
                subscriptionState.status,
                subscriptionState.items.length
              ) ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Selected ({selectedChannels.length}/{MAX_SELECTED_CHANNELS})
                    </Label>

                    {selectedChannels.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">
                        No channels selected. Choose from below.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedChannels.map((channel, index) => (
                          <div
                            key={`selected-channel-${channel.id}`}
                            className="group flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {channel.title}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {channel.url}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveChannel(index, -1)}
                                disabled={index === 0}
                                aria-label="Move up"
                              >
                                &#x2191;
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveChannel(index, 1)}
                                disabled={index === selectedChannels.length - 1}
                                aria-label="Move down"
                              >
                                &#x2193;
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveChannel(channel.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Input
                      id="subscribed-channel-search"
                      placeholder="Search subscribed channels..."
                      type="text"
                      value={channelSearch}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setChannelSearch(event.target.value)
                      }
                    />

                    <ScrollArea className="max-h-[28rem]">
                      <div className="space-y-1.5 pr-3">
                        {filteredChannels.map((channel) => {
                          const selected = isChannelSelected(
                            selectedChannels,
                            channel.id
                          );
                          const selectDisabled =
                            !selected &&
                            selectedChannels.length >= MAX_SELECTED_CHANNELS;

                          return (
                            <div
                              key={channel.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:border-border hover:bg-secondary/20"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {channel.title}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  Latest uploads shelf
                                </p>
                              </div>
                              {selected ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleRemoveChannel(channel.id)}
                                >
                                  Selected
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  disabled={selectDisabled}
                                  onClick={() => handleSelectChannel(channel.id)}
                                >
                                  Select
                                </Button>
                              )}
                            </div>
                          );
                        })}
                        {filteredChannels.length === 0 ? (
                          <p className="py-4 text-center text-sm text-muted-foreground">
                            No channels match your search
                          </p>
                        ) : null}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* ── Focus Mode ── */}
          <Card className="border-primary/10 bg-card/95 shadow-[0_4px_24px_rgba(255,78,69,0.04)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_8px_32px_rgba(255,78,69,0.08)]">
            <CardContent className="space-y-5 py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="focus-mode" className="text-sm font-medium">
                    Focus Mode
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Replace YouTube home with your curated content
                  </p>
                </div>
                <Switch
                  id="focus-mode"
                  checked={settings.focusModeEnabled}
                  onCheckedChange={handleFocusDefaultChange}
                />
              </div>

              {settings.focusModeEnabled ? (
                <div className="space-y-3 rounded-lg border border-border/60 bg-secondary/20 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Temporary pause
                      </p>
                      <p className="text-sm">
                        {temporaryDisableUi.statusText ??
                          "Pause Focus Mode briefly and let it resume automatically."}
                      </p>
                    </div>
                    <Badge variant={temporaryDisableUi.isPaused ? "warning" : "secondary"}>
                      {temporaryDisableUi.isPaused ? "Paused" : "Active"}
                    </Badge>
                  </div>

                  {temporaryDisableUi.showPauseActions ? (
                    <div className="flex flex-wrap gap-2">
                      {TEMPORARY_DISABLE_PRESET_MINUTES.map((minutes) => (
                        <Button
                          key={minutes}
                          size="sm"
                          variant="secondary"
                          onClick={() => handleTemporaryDisable(minutes)}
                        >
                          Pause for {minutes === 60 ? "1 hour" : `${minutes} min`}
                        </Button>
                      ))}
                    </div>
                  ) : null}

                  {temporaryDisableUi.showResumeAction ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResumeFocus}
                      className="w-fit"
                    >
                      Resume now
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* ── Playlist Shortcuts ── */}
          <Card className="border-primary/10 bg-card/95 shadow-[0_4px_24px_rgba(255,78,69,0.04)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_8px_32px_rgba(255,78,69,0.08)]">
            <CardHeader>
              <div className="space-y-1">
                <CardTitle>Playlist Shortcuts</CardTitle>
                <CardDescription>
                  Add up to {MAX_MANUAL_PLAYLISTS} playlists manually
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {playlists.length === 0 ? (
                <p className="py-1 text-sm text-muted-foreground">
                  No shortcuts yet. Add one below.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {playlists.map((playlist, index) =>
                    editingId === playlist.id ? (
                      <div
                        key={playlist.id}
                        className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3"
                      >
                        <div className="space-y-2">
                          <Label
                            htmlFor={`edit-title-${playlist.id}`}
                            className="text-xs"
                          >
                            Title
                          </Label>
                          <Input
                            id={`edit-title-${playlist.id}`}
                            placeholder="Playlist title"
                            type="text"
                            value={editTitle}
                            onChange={(event) =>
                              setEditTitle(event.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`edit-url-${playlist.id}`}
                            className="text-xs"
                          >
                            URL
                          </Label>
                          <Input
                            id={`edit-url-${playlist.id}`}
                            placeholder="https://www.youtube.com/playlist?list=..."
                            type="text"
                            value={editUrl}
                            onChange={(event) =>
                              setEditUrl(event.target.value)
                            }
                          />
                        </div>
                        {editError ? (
                          <StatusMessage tone="error">{editError}</StatusMessage>
                        ) : null}
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={handleSaveEdit}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <ReorderRow
                        key={playlist.id}
                        description={playlist.url}
                        disableMoveDown={index === playlists.length - 1}
                        disableMoveUp={index === 0}
                        title={playlist.title}
                        onEdit={() => handleStartEdit(playlist)}
                        onMoveDown={() => handleMovePlaylist(index, 1)}
                        onMoveUp={() => handleMovePlaylist(index, -1)}
                        onRemove={() => handleRemovePlaylist(playlist.id)}
                      />
                    )
                  )}
                </div>
              )}

              <Separator />

              {!atMax ? (
                <form className="space-y-3" onSubmit={handleAddPlaylist}>
                  <div className="space-y-2">
                    <Label htmlFor="new-playlist-title" className="text-xs">
                      Title
                    </Label>
                    <Input
                      id="new-playlist-title"
                      placeholder="Playlist title"
                      type="text"
                      value={newTitle}
                      onChange={(event) => setNewTitle(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-playlist-url" className="text-xs">
                      URL
                    </Label>
                    <Input
                      id="new-playlist-url"
                      placeholder="youtube.com/playlist?list=..."
                      type="text"
                      value={newUrl}
                      onChange={(event) => setNewUrl(event.target.value)}
                    />
                  </div>
                  {addError ? (
                    <StatusMessage tone="error">{addError}</StatusMessage>
                  ) : null}
                  <Button type="submit" size="sm">
                    Add Playlist
                  </Button>
                </form>
              ) : (
                <StatusMessage>
                  Maximum {MAX_MANUAL_PLAYLISTS} playlists reached. Remove one
                  to add another.
                </StatusMessage>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="mt-12 border-t border-border pt-6">
          {status ? <StatusMessage>{status}</StatusMessage> : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Version {extensionVersion}
          </p>
        </footer>
      </div>
    </main>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <OptionsApp />
    </StrictMode>
  );
}
