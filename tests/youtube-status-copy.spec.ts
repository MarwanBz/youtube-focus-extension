import { expect, test } from "@playwright/test";
import { getPlaylistStatusCopy } from "../src/youtube/status-copy";

test.describe("playlist status copy", () => {
  test("shows friendly guidance when a channel is required", () => {
    expect(getPlaylistStatusCopy("channel_required", null)).toEqual({
      tone: "warning",
      text: "Create a YouTube channel to use playlist import.",
    });
  });

  test("shows empty-state copy for no playlists yet", () => {
    expect(getPlaylistStatusCopy("empty", null)).toEqual({
      tone: "neutral",
      text: "No playlists found.",
    });
  });

  test("shows reconnect guidance for unauthorized state", () => {
    expect(getPlaylistStatusCopy("unauthorized", null)).toEqual({
      tone: "error",
      text: "Reconnect YouTube.",
    });
  });
});
