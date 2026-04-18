import {
  CONNECT_YOUTUBE_MESSAGE,
  type ConnectYouTubeMessage,
} from "./messages";
import {
  getAuthStateLabel,
  type ConnectYouTubeResult,
  type YouTubeAuthState,
} from "./schema";
import { patchYouTubeAuthState } from "./storage";

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
    return "YouTube is connected. Playlist import becomes available in the next task.";
  }
  if (state.uiState === "skipped") {
    return "You skipped auth for now. You can continue with Add current playlist or manual URLs.";
  }
  if (state.uiState === "cancelled") {
    return "Sign-in was cancelled. Retry when you are ready.";
  }
  if (state.uiState === "failed") {
    return state.lastError || "Auth failed. Retry or use fallback setup.";
  }
  return "Not connected yet. You can still continue without auth.";
}

export function getAuthChipText(state: YouTubeAuthState) {
  return getAuthStateLabel(state.uiState);
}
