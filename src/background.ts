import {
  createConnectYouTubeResult,
  isConnectYouTubeMessage,
} from "./auth/messages";
import {
  patchYouTubeAuthState,
  writeYouTubeAuthState,
} from "./auth/storage";
import { DEFAULT_YOUTUBE_AUTH_STATE } from "./auth/schema";
import { ensureFocusSettings } from "./settings/storage";

chrome.runtime.onInstalled.addListener(() => {
  void ensureFocusSettings();
  void writeYouTubeAuthState(DEFAULT_YOUTUBE_AUTH_STATE);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isConnectYouTubeMessage(message)) {
    return undefined;
  }

  void connectYouTube().then(sendResponse);
  return true;
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
      lastError: null,
    });
    return result;
  }

  await patchYouTubeAuthState({
    accessToken: null,
    connected: false,
    lastError: result.message,
  });

  return result;
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
