export const AUTH_STORAGE_KEY = "youtubeFocusAuth";
export const AUTH_STORAGE_AREA = "local";

export type YouTubeAuthState = {
  accessToken: string | null;
  connected: boolean;
  lastError: string | null;
};

export type ConnectYouTubeSuccess = {
  ok: true;
  status: "connected";
};

export type ConnectYouTubeCancelled = {
  ok: false;
  status: "cancelled";
  message: string;
};

export type ConnectYouTubeFailed = {
  ok: false;
  status: "failed";
  message: string;
};

export type ConnectYouTubeResult =
  | ConnectYouTubeSuccess
  | ConnectYouTubeCancelled
  | ConnectYouTubeFailed;

export const DEFAULT_YOUTUBE_AUTH_STATE: YouTubeAuthState = {
  accessToken: null,
  connected: false,
  lastError: null,
};

export function normalizeYouTubeAuthState(
  value: unknown,
  fallback: YouTubeAuthState = DEFAULT_YOUTUBE_AUTH_STATE
): YouTubeAuthState {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  const accessToken =
    typeof value.accessToken === "string" && value.accessToken.length > 0
      ? value.accessToken
      : null;

  return {
    accessToken,
    connected:
      typeof value.connected === "boolean"
        ? value.connected
        : Boolean(accessToken),
    lastError:
      typeof value.lastError === "string" && value.lastError.length > 0
        ? value.lastError
        : null,
  };
}

export function getAuthErrorMessage(error: unknown) {
  if (!error) {
    return "Authentication failed.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Authentication failed.";
}

export function isAuthCancelledMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("cancelled") ||
    normalized.includes("canceled") ||
    normalized.includes("closed by the user") ||
    normalized.includes("user did not approve")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
