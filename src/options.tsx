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
  patchFocusSettings,
  subscribeToFocusSettings,
} from "./settings/storage";
import {
  isYouTubePlaylistUrl,
  MAX_IMPORTED_PLAYLISTS,
  MAX_MANUAL_PLAYLISTS,
} from "./settings/schema";
import type { FocusSettings, PlaylistShortcut } from "./settings/schema";
import {
  DEFAULT_YOUTUBE_PLAYLIST_STATE,
  type YouTubePlaylistState,
} from "./youtube/schema";
import { subscribeToYouTubePlaylistState } from "./youtube/storage";
import { getPlaylistStatusCopy } from "./youtube/status-copy";
import {
  filterImportedPlaylists,
  isImportedPlaylistSelected,
  removeImportedPlaylistSelection,
  reorderImportedPlaylistSelections,
  selectImportedPlaylist,
  shouldShowImportedSelectionWorkspace,
} from "./youtube/selection";

const manifest =
  typeof chrome !== "undefined" && chrome.runtime?.getManifest
    ? chrome.runtime.getManifest()
    : null;
const extensionName = manifest?.name ?? "Extension";
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
    return "text-amber-300";
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
  return <p className={`text-xs ${getPlaylistTone(tone)}`}>{children}</p>;
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
    <div className="flex items-start justify-between gap-3 rounded-md border border-border/70 bg-secondary/20 px-3 py-3">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
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
        <Button size="sm" variant="ghost" onClick={onRemove}>
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
  const [playlistStatus, setPlaylistStatus] = useState("");
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [importedSearch, setImportedSearch] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => subscribeToFocusSettings(setSettings), []);
  useEffect(() => subscribeToYouTubeAuthState(setYouTubeAuth), []);
  useEffect(() => subscribeToYouTubePlaylistState(setPlaylistState), []);

  const playlists = settings.manualPlaylists;
  const selectedImportedPlaylists = settings.importedPlaylists;
  const atMax = playlists.length >= MAX_MANUAL_PLAYLISTS;
  const playlistStatusCopy = getPlaylistStatusCopy(
    playlistState.status,
    playlistState.lastError
  );
  const filteredImportedPlaylists = useMemo(
    () => filterImportedPlaylists(playlistState.items, importedSearch),
    [importedSearch, playlistState.items]
  );

  const handleFocusDefaultChange = (checked: boolean) => {
    setStatus("Saving...");
    void patchFocusSettings({ focusModeEnabled: checked })
      .then(() => setStatus("Settings saved."))
      .catch(() => setStatus("Unable to save settings."));
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
        setAuthStatus("YouTube connected. Importing playlists now...");
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
          "You skipped YouTube auth for now. Add current playlist or manual URLs to continue."
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
      setAuthStatus("Account removed. Reconnect to import playlists.");
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

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {extensionName} Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose what shows up on Focus Home and how YouTube import behaves.
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle>Connect YouTube</CardTitle>
                <CardDescription>
                  Connect YouTube to import playlists, then choose which ones
                  appear on Focus Home.
                </CardDescription>
              </div>
              <Badge
                className="w-fit"
                variant={getAuthBadgeVariant(youtubeAuth)}
              >
                {getAuthChipText(youtubeAuth)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleConnectYouTube} disabled={authLoading}>
                {authLoading ? "Connecting..." : getAuthPrimaryAction(youtubeAuth)}
              </Button>
              {!youtubeAuth.connected ? (
                <Button
                  disabled={authLoading}
                  variant="outline"
                  onClick={handleSkipAuth}
                >
                  Skip for now
                </Button>
              ) : (
                <Button
                  disabled={authLoading}
                  variant="destructive"
                  onClick={handleDisconnectYouTube}
                >
                  Remove account
                </Button>
              )}
            </div>

            <StatusMessage>{getAuthInlineMessage(youtubeAuth)}</StatusMessage>

            <div className="rounded-md border border-border/70 bg-secondary/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Fallback paths
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                If auth is skipped, cancelled, or fails, keep going with Add
                current playlist and manual playlist URLs below.
              </p>
            </div>

            {authStatus ? <StatusMessage>{authStatus}</StatusMessage> : null}
            {youtubeAuth.lastError &&
            !authStatus &&
            youtubeAuth.uiState === "failed" ? (
              <StatusMessage tone="error">{youtubeAuth.lastError}</StatusMessage>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Imported Playlists</CardTitle>
            <CardDescription>
              Imported playlists require YouTube authorization. Manual playlist
              shortcuts below remain available even when import is unavailable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={playlistLoading || !youtubeAuth.connected}
                onClick={handleRefreshImportedPlaylists}
              >
                {playlistLoading ? "Refreshing..." : "Refresh imported playlists"}
              </Button>
              <Badge variant="outline">
                {playlistState.status === "ready"
                  ? `${playlistState.items.length} imported`
                  : playlistState.status}
              </Badge>
            </div>

            {!youtubeAuth.connected ? (
              <StatusMessage tone="warning">
                Connect YouTube first, or continue using Add current playlist and
                manual URLs.
              </StatusMessage>
            ) : null}
            {playlistStatusCopy ? (
              <StatusMessage tone={playlistStatusCopy.tone}>
                {playlistStatusCopy.text}
              </StatusMessage>
            ) : null}
            {playlistStatus ? <StatusMessage>{playlistStatus}</StatusMessage> : null}

            {shouldShowImportedSelectionWorkspace(
              playlistState.status,
              playlistState.items.length
            ) ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-sm">
                        Selected for Focus Home ({selectedImportedPlaylists.length}/
                        {MAX_IMPORTED_PLAYLISTS})
                      </Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedImportedPlaylists.length === 0
                          ? `Select up to ${MAX_IMPORTED_PLAYLISTS} imported playlists.`
                          : "Reorder or remove the playlists you want on Focus Home."}
                      </p>
                    </div>
                  </div>

                  {selectedImportedPlaylists.length > 0 ? (
                    <ScrollArea className="max-h-56 rounded-md border border-border/70">
                      <div className="space-y-2 p-2">
                        {selectedImportedPlaylists.map((playlist, index) => (
                          <ReorderRow
                            key={`selected-${playlist.id}`}
                            description={playlist.url}
                            disableMoveDown={
                              index === selectedImportedPlaylists.length - 1
                            }
                            disableMoveUp={index === 0}
                            title={playlist.title}
                            onMoveDown={() =>
                              handleMoveImportedPlaylist(index, 1)
                            }
                            onMoveUp={() =>
                              handleMoveImportedPlaylist(index, -1)
                            }
                            onRemove={() =>
                              handleRemoveImportedPlaylist(playlist.id)
                            }
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  ) : null}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="imported-playlist-search">
                    Search imported playlists
                  </Label>
                  <Input
                    id="imported-playlist-search"
                    placeholder="Search by title"
                    type="text"
                    value={importedSearch}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setImportedSearch(event.target.value)
                    }
                  />
                </div>

                <ScrollArea className="max-h-72 rounded-md border border-border/70">
                  <div className="space-y-2 p-2">
                    {filteredImportedPlaylists.map((playlist) => {
                      const selected = isImportedPlaylistSelected(
                        selectedImportedPlaylists,
                        playlist.id
                      );
                      const selectDisabled =
                        !selected &&
                        selectedImportedPlaylists.length >= MAX_IMPORTED_PLAYLISTS;

                      return (
                        <div
                          key={playlist.id}
                          className="flex items-start justify-between gap-3 rounded-md border border-border/70 bg-secondary/20 px-3 py-3"
                        >
                          <div className="min-w-0 space-y-1">
                            <p className="truncate text-sm font-medium">
                              {playlist.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {playlist.videoCount === null
                                ? "Video count unavailable"
                                : `${playlist.videoCount} videos`}
                            </p>
                          </div>
                          {selected ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleRemoveImportedPlaylist(playlist.id)
                              }
                            >
                              Selected
                            </Button>
                          ) : (
                            <Button
                              disabled={selectDisabled}
                              size="sm"
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
                      <p className="px-1 py-2 text-sm text-muted-foreground">
                        No imported playlists match this search.
                      </p>
                    ) : null}
                  </div>
                </ScrollArea>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Focus Mode Default</CardTitle>
            <CardDescription>
              Focus Mode replaces the YouTube home recommendations with your
              Focus Home surface, including Watch Later and any saved playlist
              shortcuts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4 rounded-md border border-border/70 bg-secondary/20 px-4 py-3">
              <div className="space-y-1">
                <Label htmlFor="focus-mode-default">
                  Enable focus mode by default
                </Label>
                <p className="text-sm text-muted-foreground">
                  Start in Focus Mode until the user turns it off.
                </p>
              </div>
              <Switch
                checked={settings.focusModeEnabled}
                id="focus-mode-default"
                onCheckedChange={handleFocusDefaultChange}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Playlist Shortcuts</CardTitle>
            <CardDescription>
              Add up to {MAX_MANUAL_PLAYLISTS} YouTube playlists to show on your
              Focus Home.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {playlists.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No playlist shortcuts yet. Add a YouTube playlist below.
              </p>
            ) : (
              <ScrollArea className="max-h-80 rounded-md border border-border/70">
                <div className="space-y-2 p-2">
                  {playlists.map((playlist, index) => (
                    <div key={playlist.id}>
                      {editingId === playlist.id ? (
                        <div className="space-y-3 rounded-md border border-border/70 bg-secondary/20 p-3">
                          <div className="space-y-2">
                            <Label htmlFor={`edit-title-${playlist.id}`}>
                              Playlist title
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
                            <Label htmlFor={`edit-url-${playlist.id}`}>
                              Playlist URL
                            </Label>
                            <Input
                              id={`edit-url-${playlist.id}`}
                              placeholder="https://www.youtube.com/playlist?list=..."
                              type="text"
                              value={editUrl}
                              onChange={(event) => setEditUrl(event.target.value)}
                            />
                          </div>
                          {editError ? (
                            <StatusMessage tone="error">{editError}</StatusMessage>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={handleSaveEdit}>
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <ReorderRow
                          description={playlist.url}
                          disableMoveDown={index === playlists.length - 1}
                          disableMoveUp={index === 0}
                          title={playlist.title}
                          onEdit={() => handleStartEdit(playlist)}
                          onMoveDown={() => handleMovePlaylist(index, 1)}
                          onMoveUp={() => handleMovePlaylist(index, -1)}
                          onRemove={() => handleRemovePlaylist(playlist.id)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <Separator />

            {!atMax ? (
              <form className="space-y-3" onSubmit={handleAddPlaylist}>
                <div className="space-y-2">
                  <Label htmlFor="new-playlist-title">Add Playlist</Label>
                  <Input
                    id="new-playlist-title"
                    placeholder="Playlist title"
                    type="text"
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-playlist-url">Playlist URL</Label>
                  <Input
                    id="new-playlist-url"
                    placeholder="https://www.youtube.com/playlist?list=..."
                    type="text"
                    value={newUrl}
                    onChange={(event) => setNewUrl(event.target.value)}
                  />
                </div>
                {addError ? (
                  <StatusMessage tone="error">{addError}</StatusMessage>
                ) : null}
                <Button type="submit">Add Playlist</Button>
              </form>
            ) : (
              <StatusMessage>
                Maximum {MAX_MANUAL_PLAYLISTS} playlists reached. Remove one to
                add another.
              </StatusMessage>
            )}
          </CardContent>
        </Card>

        <div className="space-y-2">
          {status ? <StatusMessage>{status}</StatusMessage> : null}
          <p className="text-xs text-muted-foreground">Version {extensionVersion}</p>
        </div>
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
