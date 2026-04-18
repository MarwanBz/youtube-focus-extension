import { expect, test } from "@playwright/test";
import { fetchYouTubePlaylistPreview } from "../src/youtube/preview-api";

test.describe("playlist preview API", () => {
  test("normalizes playlist item thumbnails into preview videos", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          items: [
            {
              snippet: {
                title: "System Design Interview",
                videoOwnerChannelTitle: "Engineering Insights",
                thumbnails: {
                  high: { url: "https://i.ytimg.com/vi/video-1/hqdefault.jpg" },
                },
                resourceId: {
                  videoId: "video-1",
                },
              },
              contentDetails: {
                videoId: "video-1",
              },
            },
          ],
        }),
        { status: 200 }
      );

    const result = await fetchYouTubePlaylistPreview(
      "token-123",
      "PL_ENGINEERING",
      fetchMock
    );

    expect(result).toEqual({
      ok: true,
      items: [
        {
          videoId: "video-1",
          title: "System Design Interview",
          thumbnailUrl: "https://i.ytimg.com/vi/video-1/hqdefault.jpg",
          channelTitle: "Engineering Insights",
        },
      ],
    });
  });

  test("maps unauthorized preview fetches to reconnect state", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(
        JSON.stringify({ error: { message: "Invalid Credentials" } }),
        { status: 401 }
      );

    const result = await fetchYouTubePlaylistPreview(
      "token-123",
      "PL_ENGINEERING",
      fetchMock
    );

    expect(result).toEqual({
      ok: false,
      status: "unauthorized",
      message: "Invalid Credentials",
    });
  });
});
