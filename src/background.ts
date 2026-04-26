import {
  createConnectYouTubeResult,
  isConnectYouTubeMessage,
  isDisconnectYouTubeMessage,
} from "./auth/messages";
import {
  readYouTubeAuthState,
  patchYouTubeAuthState,
  writeYouTubeAuthState,
} from "./auth/storage";
import { DEFAULT_YOUTUBE_AUTH_STATE } from "./auth/schema";
import { fetchYouTubePlaylists } from "./youtube/api";
import {
  createFetchPlaylistsResponse,
  isFetchYouTubePlaylistsMessage,
  type FetchYouTubePlaylistsResponse,
} from "./youtube/messages";
import {
  DEFAULT_YOUTUBE_PLAYLIST_STATE,
  type YouTubePlaylistState,
} from "./youtube/schema";
import {
  patchYouTubePlaylistState,
  writeYouTubePlaylistState,
} from "./youtube/storage";
import { fetchYouTubePlaylistPreview } from "./youtube/preview-api";
import {
  DEFAULT_YOUTUBE_PLAYLIST_PREVIEW_STATE,
  type PlaylistPreview,
} from "./youtube/preview-schema";
import {
  writeYouTubePlaylistPreviewState,
} from "./youtube/preview-storage";
import {
  ensureFocusSettings,
  patchFocusSettings,
  readFocusSettings,
  subscribeToFocusSettings,
} from "./settings/storage";

chrome.runtime.onInstalled.addListener(() => {
  void ensureFocusSettings();
  void writeYouTubeAuthState(DEFAULT_YOUTUBE_AUTH_STATE);
  void writeYouTubePlaylistState(DEFAULT_YOUTUBE_PLAYLIST_STATE);
  void writeYouTubePlaylistPreviewState(DEFAULT_YOUTUBE_PLAYLIST_PREVIEW_STATE);
});

void subscribeToFocusSettings(() => {
  void syncSelectedPlaylistPreviews();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (isConnectYouTubeMessage(message)) {
    void connectYouTube().then(sendResponse);
    return true;
  }

  if (isDisconnectYouTubeMessage(message)) {
    void disconnectYouTube().then(sendResponse);
    return true;
  }

  if (isFetchYouTubePlaylistsMessage(message)) {
    void fetchAndStoreYouTubePlaylists().then(sendResponse);
    return true;
  }

  if (message && message.action === "open_options") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return true;
  }

  return undefined;
});

export async function connectYouTube(): Promise<
  import("./auth/schema").ConnectYouTubeResult
> {
  const authToken = await getAuthToken();
  const result = createConnectYouTubeResult(authToken.token, authToken.error);

  if (result.ok) {
    await patchYouTubeAuthState({
      accessToken: authToken.token ?? null,
      connected: true,
      uiState: "connected",
      lastError: null,
    });
    void fetchAndStoreYouTubePlaylists();
    return result;
  }

  await patchYouTubeAuthState({
    accessToken: null,
    connected: false,
    uiState: result.status,
    lastError: result.message,
  });

  return result;
}

export async function disconnectYouTube(): Promise<{
  ok: true;
}> {
  const authState = await readYouTubeAuthState();

  if (authState.accessToken) {
    await revokeTokenOnServer(authState.accessToken);
  }
  await clearAllCachedAuthTokens();

  await patchYouTubeAuthState({
    accessToken: null,
    connected: false,
    uiState: "not_connected",
    lastError: null,
  });
  await writeYouTubePlaylistState(DEFAULT_YOUTUBE_PLAYLIST_STATE);
  await writeYouTubePlaylistPreviewState(DEFAULT_YOUTUBE_PLAYLIST_PREVIEW_STATE);
  await patchFocusSettings({ importedPlaylists: [] });

  return { ok: true };
}

function clearAllCachedAuthTokens(): Promise<void> {
  return new Promise((resolve) => {
    if (!chrome.identity?.clearAllCachedAuthTokens) {
      resolve();
      return;
    }

    chrome.identity.clearAllCachedAuthTokens(() => {
      resolve();
    });
  });
}

async function revokeTokenOnServer(token: string): Promise<void> {
  try {
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`
    );
  } catch {
    // best-effort: if the network call fails, the local cache is already cleared
  }
}

export async function fetchAndStoreYouTubePlaylists(): Promise<FetchYouTubePlaylistsResponse> {
  const authState = await readYouTubeAuthState();
  if (!authState.connected || !authState.accessToken) {
    await patchYouTubePlaylistState({
      status: "idle",
      items: [],
      updatedAt: null,
      lastError: null,
      nextPageSeen: false,
    });
    return {
      ok: false,
      status: "not_connected",
      message: "Connect YouTube before importing playlists.",
    };
  }

  await patchYouTubePlaylistState({
    status: "loading",
    lastError: null,
  });

  const result = await fetchYouTubePlaylists(authState.accessToken);
  const response = createFetchPlaylistsResponse(result);

  if (!result.ok) {
    const nextState: Partial<YouTubePlaylistState> = {
      status: result.status,
      lastError: result.message,
      updatedAt: new Date().toISOString(),
    };
    if (result.status === "unauthorized") {
      await patchYouTubeAuthState({
        accessToken: null,
        connected: false,
        uiState: "failed",
        lastError: result.message,
      });
    }
    await patchYouTubePlaylistState(nextState);
    return response;
  }

  await patchYouTubePlaylistState({
    status: result.items.length > 0 ? "ready" : "empty",
    items: result.items,
    updatedAt: new Date().toISOString(),
    lastError: null,
    nextPageSeen: result.nextPageSeen,
  });
  await syncSelectedPlaylistPreviews();

  return response;
}

async function syncSelectedPlaylistPreviews(): Promise<void> {
  const authState = await readYouTubeAuthState();
  const settings = await readFocusSettings();

  if (
    !authState.connected ||
    !authState.accessToken ||
    settings.importedPlaylists.length === 0
  ) {
    await writeYouTubePlaylistPreviewState(DEFAULT_YOUTUBE_PLAYLIST_PREVIEW_STATE);
    return;
  }

  const previews: PlaylistPreview[] = [];

  for (const playlist of settings.importedPlaylists) {
    const result = await fetchYouTubePlaylistPreview(
      authState.accessToken,
      playlist.id
    );

    if (!result.ok) {
      if (result.status === "unauthorized") {
        await patchYouTubeAuthState({
          accessToken: null,
          connected: false,
          uiState: "failed",
          lastError: result.message,
        });
        await writeYouTubePlaylistPreviewState(
          DEFAULT_YOUTUBE_PLAYLIST_PREVIEW_STATE
        );
        return;
      }

      previews.push({
        playlistId: playlist.id,
        items: [],
        updatedAt: new Date().toISOString(),
      });
      continue;
    }

    previews.push({
      playlistId: playlist.id,
      items: result.items,
      updatedAt: new Date().toISOString(),
    });
  }

  await writeYouTubePlaylistPreviewState({
    playlists: previews,
    updatedAt: new Date().toISOString(),
  });
}

function getAuthToken(): Promise<{ token?: string; error?: unknown }> {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.identity?.getAuthToken) {
      resolve({ error: "Chrome identity API is unavailable." });
      return;
    }

    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      const runtimeError = chrome.runtime?.lastError;
      if (runtimeError) {
        resolve({ error: runtimeError.message });
        return;
      }

      if (!token) {
        resolve({ error: "No auth token was returned." });
        return;
      }

      resolve({ token });
    });
  });
}
