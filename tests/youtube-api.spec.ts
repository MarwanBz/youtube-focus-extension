import { expect, test } from "@playwright/test";
import { fetchYouTubePlaylists } from "../src/youtube/api";
import { createFetchPlaylistsResponse } from "../src/youtube/messages";
import { normalizePlaylistItems } from "../src/youtube/normalize";

test.describe("YouTube playlist API", () => {
  test("aggregates paginated playlists", async () => {
    const pageOne = {
      items: [
        {
          id: "PL_1",
          snippet: { title: "First playlist" },
          contentDetails: { itemCount: 10 },
        },
      ],
      nextPageToken: "next-token",
    };
    const pageTwo = {
      items: [
        {
          id: "PL_2",
          snippet: { title: "Second playlist" },
          contentDetails: { itemCount: 20 },
        },
      ],
    };

    const fetchMock: typeof fetch = async (input) => {
      const url = String(input);
      const payload = url.includes("pageToken=next-token") ? pageTwo : pageOne;
      return new Response(JSON.stringify(payload), { status: 200 });
    };

    const result = await fetchYouTubePlaylists("token-123", fetchMock);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.items).toHaveLength(2);
    expect(result.nextPageSeen).toBe(true);
    expect(result.items[0].id).toBe("PL_1");
    expect(result.items[1].id).toBe("PL_2");
  });

  test("maps unauthorized response to reconnect state", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(
        JSON.stringify({ error: { message: "Invalid Credentials" } }),
        { status: 401 }
      );

    const result = await fetchYouTubePlaylists("token-123", fetchMock);
    expect(result).toEqual({
      ok: false,
      status: "unauthorized",
      message: "Invalid Credentials",
    });
  });

  test("maps network errors to unavailable state", async () => {
    const fetchMock: typeof fetch = async () => {
      throw new Error("Network down");
    };

    const result = await fetchYouTubePlaylists("token-123", fetchMock);
    expect(result).toEqual({
      ok: false,
      status: "unavailable",
      message: "Unable to reach YouTube right now. Check your connection and retry.",
    });
  });
});

test.describe("YouTube playlist normalization and message mapping", () => {
  test("normalizes playlist items into Focus format", () => {
    const normalized = normalizePlaylistItems([
      {
        id: "PL_100",
        snippet: {
          title: "Focus List",
          thumbnails: { medium: { url: "https://img.example/thumb.jpg" } },
        },
        contentDetails: { itemCount: 42 },
      },
    ]);

    expect(normalized).toEqual([
      {
        id: "PL_100",
        title: "Focus List",
        url: "https://www.youtube.com/playlist?list=PL_100",
        videoCount: 42,
        thumbnailUrl: "https://img.example/thumb.jpg",
      },
    ]);
  });

  test("maps empty fetch results to empty UI status", () => {
    expect(
      createFetchPlaylistsResponse({
        ok: true,
        items: [],
        nextPageSeen: false,
      })
    ).toEqual({
      ok: true,
      status: "empty",
    });
  });
});
