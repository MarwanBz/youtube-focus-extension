export const AUTH_STORAGE_KEY = "youtubeFocusAuth";
export const AUTH_STORAGE_AREA = "local";

export const AUTH_UI_STATES = [
  "not_connected",
  "skipped",
  "cancelled",
  "failed",
  "connected",
] as const;

export type YouTubeAuthUiState = (typeof AUTH_UI_STATES)[number];

export type YouTubeAuthState = {
  accessToken: string | null;
  connected: boolean;
  uiState: YouTubeAuthUiState;
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
  uiState: "not_connected",
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
  const connected =
    typeof value.connected === "boolean" ? value.connected : Boolean(accessToken);

  return {
    accessToken,
    connected,
    uiState: normalizeUiState(value.uiState, connected),
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

export function getAuthStateLabel(state: YouTubeAuthUiState) {
  switch (state) {
    case "connected":
      return "Connected";
    case "skipped":
      return "Skipped";
    case "cancelled":
      return "Cancelled";
    case "failed":
      return "Needs retry";
    case "not_connected":
    default:
      return "Not connected";
  }
}

function normalizeUiState(
  value: unknown,
  connected: boolean
): YouTubeAuthUiState {
  if (connected) {
    return "connected";
  }

  if (typeof value !== "string") {
    return "not_connected";
  }

  return AUTH_UI_STATES.includes(value as YouTubeAuthUiState)
    ? (value as YouTubeAuthUiState)
    : "not_connected";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
