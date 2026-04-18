import {
  getAuthErrorMessage,
  isAuthCancelledMessage,
  type ConnectYouTubeResult,
} from "./schema";

export const CONNECT_YOUTUBE_MESSAGE = "youtube-focus/connect-youtube";
export const DISCONNECT_YOUTUBE_MESSAGE = "youtube-focus/disconnect-youtube";

export type ConnectYouTubeMessage = {
  type: typeof CONNECT_YOUTUBE_MESSAGE;
};

export type DisconnectYouTubeMessage = {
  type: typeof DISCONNECT_YOUTUBE_MESSAGE;
};

export function isConnectYouTubeMessage(
  value: unknown
): value is ConnectYouTubeMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === CONNECT_YOUTUBE_MESSAGE
  );
}

export function isDisconnectYouTubeMessage(
  value: unknown
): value is DisconnectYouTubeMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === DISCONNECT_YOUTUBE_MESSAGE
  );
}

export function createConnectYouTubeResult(
  token: string | undefined,
  error: unknown
): ConnectYouTubeResult {
  if (token) {
    return {
      ok: true,
      status: "connected",
    };
  }

  const message = getAuthErrorMessage(error);
  if (isAuthCancelledMessage(message)) {
    return {
      ok: false,
      status: "cancelled",
      message,
    };
  }

  return {
    ok: false,
    status: "failed",
    message,
  };
}
