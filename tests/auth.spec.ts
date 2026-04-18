import { expect, test } from "@playwright/test";
import {
  CONNECT_YOUTUBE_MESSAGE,
  createConnectYouTubeResult,
  isConnectYouTubeMessage,
} from "../src/auth/messages";
import {
  DEFAULT_YOUTUBE_AUTH_STATE,
  normalizeYouTubeAuthState,
} from "../src/auth/schema";

test.describe("YouTube auth message handling", () => {
  test("recognizes the connect YouTube message shape", () => {
    expect(
      isConnectYouTubeMessage({ type: CONNECT_YOUTUBE_MESSAGE })
    ).toBe(true);
    expect(isConnectYouTubeMessage({ type: "other" })).toBe(false);
  });

  test("returns a connected result when a token is present", () => {
    expect(createConnectYouTubeResult("token-123", null)).toEqual({
      ok: true,
      status: "connected",
    });
  });

  test("returns a cancelled result for user-cancelled auth", () => {
    expect(
      createConnectYouTubeResult(undefined, "OAuth flow cancelled by user")
    ).toEqual({
      ok: false,
      status: "cancelled",
      message: "OAuth flow cancelled by user",
    });
  });

  test("returns a failed result for non-cancel auth errors", () => {
    expect(
      createConnectYouTubeResult(undefined, "Network request failed")
    ).toEqual({
      ok: false,
      status: "failed",
      message: "Network request failed",
    });
  });
});

test.describe("YouTube auth state normalization", () => {
  test("keeps the default auth state conservative", () => {
    expect(normalizeYouTubeAuthState(undefined)).toEqual(
      DEFAULT_YOUTUBE_AUTH_STATE
    );
  });

  test("keeps connected state when a token exists", () => {
    expect(
      normalizeYouTubeAuthState({
        accessToken: "token-123",
        connected: true,
        lastError: null,
      })
    ).toEqual({
      accessToken: "token-123",
      connected: true,
      lastError: null,
    });
  });
});
