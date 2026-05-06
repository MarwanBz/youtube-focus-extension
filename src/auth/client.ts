import {
  CONNECT_YOUTUBE_MESSAGE,
  DISCONNECT_YOUTUBE_MESSAGE,
  type ConnectYouTubeMessage,
  type DisconnectYouTubeMessage,
} from "./messages";
import {
  getAuthStateLabel,
  type ConnectYouTubeResult,
  type YouTubeAuthState,
} from "./schema";
import { patchYouTubeAuthState } from "./storage";
import {
  FETCH_YOUTUBE_PLAYLISTS_MESSAGE,
  type FetchYouTubePlaylistsMessage,
  type FetchYouTubePlaylistsResponse,
} from "../youtube/messages";

export async function connectYouTubeFromUi() {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return {
      ok: false as const,
      message: "YouTube auth is unavailable in this environment.",
    };
  }

  const message: ConnectYouTubeMessage = {
    type: CONNECT_YOUTUBE_MESSAGE,
  };

  return new Promise<
    | { ok: true; result: ConnectYouTubeResult }
    | { ok: false; message: string }
  >((resolve) => {
    chrome.runtime.sendMessage(message, (result: ConnectYouTubeResult) => {
      const runtimeError = chrome.runtime?.lastError;
      if (runtimeError) {
        resolve({
          ok: false,
          message: runtimeError.message || "Unable to connect YouTube.",
        });
        return;
      }

      if (!result) {
        resolve({
          ok: false,
          message: "Unable to connect YouTube.",
        });
        return;
      }

      resolve({ ok: true, result });
    });
  });
}

export async function skipYouTubeAuth() {
  await patchYouTubeAuthState({
    accessToken: null,
    connected: false,
    uiState: "skipped",
    lastError: null,
  });
}

export async function disconnectYouTube() {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    await restoreYouTubeAuthState({
      accessToken: null,
      connected: false,
      uiState: "not_connected",
      lastError: null,
    });
    return;
  }

  const message: DisconnectYouTubeMessage = {
    type: DISCONNECT_YOUTUBE_MESSAGE,
  };

  return new Promise<{ ok: true }>((resolve) => {
    chrome.runtime.sendMessage(message, (result: { ok: true } | undefined) => {
      const runtimeError = chrome.runtime?.lastError;
      if (runtimeError) {
        resolve({ ok: true });
        return;
      }
      resolve(result ?? { ok: true });
    });
  });
}

async function restoreYouTubeAuthState(state: {
  accessToken: null;
  connected: false;
  uiState: "not_connected";
  lastError: null;
}) {
  await patchYouTubeAuthState(state);
}

export function getAuthPrimaryAction(state: YouTubeAuthState) {
  if (state.connected) {
    return "Reconnect YouTube";
  }
  if (state.uiState === "cancelled" || state.uiState === "failed") {
    return "Retry YouTube";
  }
  return "Connect YouTube";
}

export function getCompactAuthTone(state: YouTubeAuthState) {
  if (state.connected) {
    return "text-emerald-400";
  }
  if (state.uiState === "failed") {
    return "text-red-400";
  }
  if (state.uiState === "cancelled" || state.uiState === "skipped") {
    return "text-amber-300";
  }
  return "text-gray-400";
}

export function getAuthInlineMessage(state: YouTubeAuthState) {
  if (state.connected) {
    return "YouTube is connected. Import playlists and subscribed channels in Settings while Watch Later stays available as a shortcut.";
  }
  if (state.uiState === "skipped") {
    return "You skipped auth for now. You can still use Watch Later and add manual playlist URLs.";
  }
  if (state.uiState === "cancelled") {
    return "Sign-in was cancelled. Retry when you are ready.";
  }
  if (state.uiState === "failed") {
    return state.lastError || "Auth failed. Retry or use fallback setup.";
  }
  return "Not connected yet. Watch Later still works, and you can continue with manual playlist shortcuts until you connect YouTube for playlists and channels.";
}

export function getAuthChipText(state: YouTubeAuthState) {
  return getAuthStateLabel(state.uiState);
}

export async function requestYouTubePlaylistFetch() {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return {
      ok: false as const,
      status: "failed" as const,
      message: "Playlist fetch is unavailable in this environment.",
    };
  }

  const message: FetchYouTubePlaylistsMessage = {
    type: FETCH_YOUTUBE_PLAYLISTS_MESSAGE,
  };

  return new Promise<FetchYouTubePlaylistsResponse>((resolve) => {
    chrome.runtime.sendMessage(
      message,
      (result: FetchYouTubePlaylistsResponse | undefined) => {
        const runtimeError = chrome.runtime?.lastError;
        if (runtimeError) {
          resolve({
            ok: false,
            status: "failed",
            message: runtimeError.message || "Unable to fetch playlists.",
          });
          return;
        }

        if (!result) {
          resolve({
            ok: false,
            status: "failed",
            message: "Unable to fetch playlists.",
          });
          return;
        }

        resolve(result);
      }
    );
  });
}
