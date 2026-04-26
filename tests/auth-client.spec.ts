import { expect, test } from "@playwright/test";
import {
  getAuthInlineMessage,
  getAuthPrimaryAction,
} from "../src/auth/client";
import type { YouTubeAuthState } from "../src/auth/schema";

const baseState: YouTubeAuthState = {
  accessToken: null,
  connected: false,
  uiState: "not_connected",
  lastError: null,
};

test.describe("auth client display helpers", () => {
  test("uses retry action for cancelled and failed states", () => {
    expect(
      getAuthPrimaryAction({
        ...baseState,
        uiState: "cancelled",
      })
    ).toBe("Retry YouTube");
    expect(
      getAuthPrimaryAction({
        ...baseState,
        uiState: "failed",
        lastError: "Network error",
      })
    ).toBe("Retry YouTube");
  });

  test("uses reconnect action for connected state", () => {
    expect(
      getAuthPrimaryAction({
        ...baseState,
        accessToken: "token-1",
        connected: true,
        uiState: "connected",
      })
    ).toBe("Reconnect YouTube");
  });

  test("includes fallback message in skipped state", () => {
    expect(
      getAuthInlineMessage({
        ...baseState,
        uiState: "skipped",
      })
    ).toContain("Watch Later");
  });

  test("keeps Watch Later visible in connected and default states", () => {
    expect(
      getAuthInlineMessage({
        ...baseState,
        accessToken: "token-1",
        connected: true,
        uiState: "connected",
      })
    ).toContain("Watch Later");

    expect(getAuthInlineMessage(baseState)).toContain("Watch Later");
  });
});
