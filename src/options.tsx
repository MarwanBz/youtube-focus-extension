import {
  StrictMode,
  useEffect,
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
  getAuthChipText,
  getAuthInlineMessage,
  getAuthPrimaryAction,
  skipYouTubeAuth,
} from "./auth/client";
import { subscribeToYouTubeAuthState } from "./auth/storage";
import {
  patchFocusSettings,
  subscribeToFocusSettings,
} from "./settings/storage";
import {
  isYouTubePlaylistUrl,
  MAX_MANUAL_PLAYLISTS,
} from "./settings/schema";
import type { FocusSettings, PlaylistShortcut } from "./settings/schema";

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

  const playlists = settings.manualPlaylists;
  const atMax = playlists.length >= MAX_MANUAL_PLAYLISTS;

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
        setAuthStatus("YouTube connected. Playlist import comes next.");
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

  return (
    <div className="min-h-screen bg-gray-950 px-6 py-8 text-white">
      <h1 className="text-lg font-semibold">{extensionName} Settings</h1>

      <div className="mt-4 max-w-md rounded-md border border-white/15 p-4">
        <h2 className="text-sm font-semibold">Connect YouTube</h2>
        <p className="mt-1 text-xs text-gray-400">
          Connect YouTube to import your playlists. This is the primary setup
          path. Playlist selection will arrive in the next task.
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
          ) : null}
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
