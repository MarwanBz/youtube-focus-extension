import {
  StrictMode,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { createRoot } from "react-dom/client";
import "@lib/styles/globals.css";
import { DEFAULT_FOCUS_SETTINGS } from "./settings/defaults";
import {
  DEFAULT_YOUTUBE_AUTH_STATE,
  type YouTubeAuthState,
} from "./auth/schema";
import {
  connectYouTubeFromUi,
  disconnectYouTube,
  getAuthChipText,
  getAuthInlineMessage,
  getAuthPrimaryAction,
  requestYouTubePlaylistFetch,
  skipYouTubeAuth,
} from "./auth/client";
import { subscribeToYouTubeAuthState } from "./auth/storage";
import {
  DEFAULT_YOUTUBE_PLAYLIST_STATE,
  type YouTubePlaylistState,
} from "./youtube/schema";
import { subscribeToYouTubePlaylistState } from "./youtube/storage";
import { getPlaylistStatusCopy } from "./youtube/status-copy";
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

  useEffect(() => {
    return subscribeToFocusSettings(setSettings);
  }, []);

  useEffect(() => {
    return subscribeToYouTubeAuthState(setYouTubeAuth);
  }, []);
  useEffect(() => {
    return subscribeToYouTubePlaylistState(setPlaylistState);
  }, []);

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

  const handleFocusDefaultChange = (event: ChangeEvent<HTMLInputElement>) => {
    const focusModeEnabled = event.target.checked;
    setStatus("Saving...");
    void patchFocusSettings({ focusModeEnabled })
      .then(() => setStatus("Settings saved."))
      .catch(() => setStatus("Unable to save settings."));
  };

  const handleAddPlaylist = (e: FormEvent) => {
    e.preventDefault();
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
    const updated = playlists.filter((p) => p.id !== id);
    setStatus("Saving...");
    void patchFocusSettings({ manualPlaylists: updated })
      .then(() => setStatus("Playlist removed."))
      .catch(() => setStatus("Unable to remove playlist."));
  };

  const handleMovePlaylist = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= playlists.length) return;
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

    const updated = playlists.map((p) =>
      p.id === editingId ? { ...p, title, url } : p
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
    <div className="min-h-screen bg-gray-950 px-6 py-8 text-white">
      <h1 className="text-lg font-semibold">{extensionName} Settings</h1>

      <div className="mt-4 max-w-md rounded-md border border-white/15 p-4">
        <h2 className="text-sm font-semibold">Connect YouTube</h2>
        <p className="mt-1 text-xs text-gray-400">
          Connect YouTube to import playlists, then choose which ones appear on
          Focus Home.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleConnectYouTube}
            disabled={authLoading}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-500 disabled:cursor-default disabled:opacity-60"
          >
            {authLoading ? "Connecting..." : getAuthPrimaryAction(youtubeAuth)}
          </button>
          {!youtubeAuth.connected ? (
            <button
              type="button"
              onClick={handleSkipAuth}
              disabled={authLoading}
              className="rounded border border-white/15 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white disabled:cursor-default disabled:opacity-60"
            >
              Skip for now
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDisconnectYouTube}
              disabled={authLoading}
              className="rounded border border-red-500/50 px-3 py-1.5 text-xs font-medium text-red-400 hover:border-red-400 disabled:cursor-default disabled:opacity-60"
            >
              Remove account
            </button>
          )}
          <span
            className={`text-xs ${
              youtubeAuth.connected ? "text-emerald-400" : "text-gray-300"
            }`}
          >
            {getAuthChipText(youtubeAuth)}
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {getAuthInlineMessage(youtubeAuth)}
        </p>
        <div className="mt-3 rounded border border-white/10 bg-gray-900/50 p-3">
          <p className="text-xs font-semibold text-gray-200">Fallback paths</p>
          <p className="mt-1 text-xs text-gray-400">
            If auth is skipped, cancelled, or fails, keep going with Add current
            playlist and manual playlist URLs below.
          </p>
        </div>
        {authStatus ? (
          <p className="mt-2 text-xs text-gray-300">{authStatus}</p>
        ) : null}
        {youtubeAuth.lastError && !authStatus && youtubeAuth.uiState === "failed" ? (
          <p className="mt-2 text-xs text-red-400">{youtubeAuth.lastError}</p>
        ) : null}
      </div>

      <div className="mt-4 max-w-md rounded-md border border-white/15 p-4">
        <h2 className="text-sm font-semibold">Imported Playlists</h2>
        <p className="mt-1 text-xs text-gray-400">
          Imported playlists require YouTube authorization. Manual playlist
          shortcuts below remain available even when import is unavailable.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefreshImportedPlaylists}
            disabled={playlistLoading || !youtubeAuth.connected}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-500 disabled:cursor-default disabled:opacity-60"
          >
            {playlistLoading ? "Refreshing..." : "Refresh imported playlists"}
          </button>
          <span className="text-xs text-gray-300">
            {playlistState.status === "ready"
              ? `${playlistState.items.length} imported`
              : playlistState.status}
          </span>
        </div>

        {youtubeAuth.connected ? null : (
          <p className="mt-2 text-xs text-amber-300">
            Connect YouTube first, or continue using Add current playlist and
            manual URLs.
          </p>
        )}
        {playlistStatusCopy ? (
          <p
            className={`mt-2 text-xs ${
              playlistStatusCopy.tone === "error"
                ? "text-red-400"
                : playlistStatusCopy.tone === "warning"
                  ? "text-amber-300"
                  : "text-gray-300"
            }`}
          >
            {playlistStatusCopy.text}
          </p>
        ) : null}
        {playlistStatus ? (
          <p className="mt-2 text-xs text-gray-300">{playlistStatus}</p>
        ) : null}
        {shouldShowImportedSelectionWorkspace(
          playlistState.status,
          playlistState.items.length
        ) ? (
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-200">
                Selected for Focus Home ({selectedImportedPlaylists.length}/
                {MAX_IMPORTED_PLAYLISTS})
              </p>
              {selectedImportedPlaylists.length === 0 ? (
                <p className="mt-1 text-xs text-gray-400">
                  Select up to {MAX_IMPORTED_PLAYLISTS} imported playlists.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {selectedImportedPlaylists.map((playlist, index) => (
                    <li
                      key={`selected-${playlist.id}`}
                      className="rounded border border-white/10 bg-gray-900/50 p-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-gray-100">
                            {playlist.title}
                          </p>
                          <p className="truncate text-[11px] text-gray-500">
                            {playlist.url}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveImportedPlaylist(index, -1)}
                            disabled={index === 0}
                            className="px-1 text-xs text-gray-400 hover:text-white disabled:opacity-30"
                            aria-label="Move up"
                          >
                            &#x2191;
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveImportedPlaylist(index, 1)}
                            disabled={index === selectedImportedPlaylists.length - 1}
                            className="px-1 text-xs text-gray-400 hover:text-white disabled:opacity-30"
                            aria-label="Move down"
                          >
                            &#x2193;
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImportedPlaylist(playlist.id)}
                            className="px-1 text-xs text-gray-400 hover:text-red-400"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-200" htmlFor="imported-playlist-search">
                Search imported playlists
              </label>
              <input
                id="imported-playlist-search"
                type="text"
                value={importedSearch}
                onChange={(event) => setImportedSearch(event.target.value)}
                placeholder="Search by title"
                className="mt-1 w-full rounded border border-white/15 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <ul className="space-y-2">
              {filteredImportedPlaylists.map((playlist) => {
                const selected = isImportedPlaylistSelected(
                  selectedImportedPlaylists,
                  playlist.id
                );
                const selectDisabled =
                  !selected &&
                  selectedImportedPlaylists.length >= MAX_IMPORTED_PLAYLISTS;

                return (
                  <li
                    key={playlist.id}
                    className="rounded border border-white/10 bg-gray-900/50 p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-gray-100">
                          {playlist.title}
                        </p>
                        <p className="truncate text-[11px] text-gray-500">
                          {playlist.videoCount === null
                            ? "Video count unavailable"
                            : `${playlist.videoCount} videos`}
                        </p>
                      </div>
                      {selected ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveImportedPlaylist(playlist.id)}
                          className="shrink-0 rounded border border-white/20 px-2 py-1 text-xs text-gray-200 hover:text-white"
                        >
                          Selected
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectImportedPlaylist(playlist.id)}
                          disabled={selectDisabled}
                          className="shrink-0 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-default disabled:opacity-50"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {filteredImportedPlaylists.length === 0 ? (
              <p className="text-xs text-gray-400">
                No imported playlists match this search.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 max-w-md rounded-md border border-white/15 p-4">
        <label className="flex items-start gap-3 text-sm">
          <input
            checked={settings.focusModeEnabled}
            className="mt-1"
            type="checkbox"
            onChange={handleFocusDefaultChange}
          />
          <span>
            <span className="block font-semibold">
              Enable focus mode by default
            </span>
            <span className="mt-1 block text-xs text-gray-400">
              Focus Mode replaces the YouTube home recommendations with your
              Focus Home surface, including Watch Later and any saved playlist
              shortcuts.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-6 max-w-md">
        <h2 className="text-sm font-semibold">Playlist Shortcuts</h2>
        <p className="mt-1 text-xs text-gray-400">
          Add up to {MAX_MANUAL_PLAYLISTS} YouTube playlists to show on your
          Focus Home.
        </p>

        {playlists.length === 0 ? (
          <p className="mt-3 text-xs text-gray-500">
            No playlist shortcuts yet. Add a YouTube playlist below.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {playlists.map((playlist, index) => (
              <li
                key={playlist.id}
                className="rounded-md border border-white/15 p-3"
              >
                {editingId === playlist.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Playlist title"
                      className="w-full rounded border border-white/15 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="https://www.youtube.com/playlist?list=..."
                      className="w-full rounded border border-white/15 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                    {editError ? (
                      <p className="text-xs text-red-400">{editError}</p>
                    ) : null}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="rounded bg-blue-600 px-3 py-1 text-xs font-medium hover:bg-blue-500"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded px-3 py-1 text-xs text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {playlist.title}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {playlist.url}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMovePlaylist(index, -1)}
                        disabled={index === 0}
                        className="px-1 text-xs text-gray-400 hover:text-white disabled:opacity-30"
                        aria-label="Move up"
                      >
                        &#x2191;
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMovePlaylist(index, 1)}
                        disabled={index === playlists.length - 1}
                        className="px-1 text-xs text-gray-400 hover:text-white disabled:opacity-30"
                        aria-label="Move down"
                      >
                        &#x2193;
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(playlist)}
                        className="px-1 text-xs text-gray-400 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePlaylist(playlist.id)}
                        className="px-1 text-xs text-gray-400 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!atMax ? (
        <form
          onSubmit={handleAddPlaylist}
          className="mt-4 max-w-md rounded-md border border-white/15 p-4"
        >
          <p className="text-xs font-semibold text-gray-300">
            Add Playlist
          </p>
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Playlist title"
              className="w-full rounded border border-white/15 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=..."
              className="w-full rounded border border-white/15 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            {addError ? (
              <p className="text-xs text-red-400">{addError}</p>
            ) : null}
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-500"
            >
              Add Playlist
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-4 max-w-md text-xs text-gray-500">
          Maximum {MAX_MANUAL_PLAYLISTS} playlists reached. Remove one to add
          another.
        </p>
      )}

      {status ? (
        <p className="mt-3 text-xs text-gray-400">{status}</p>
      ) : null}
      <p className="mt-6 text-xs text-gray-500">
        Version {extensionVersion}
      </p>
    </div>
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
