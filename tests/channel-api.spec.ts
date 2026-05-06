import { expect, test } from "@playwright/test";
import { fetchYouTubeChannelVideos } from "../src/youtube/channel-api";

test.describe("channel videos API", () => {
  test("normalizes latest channel videos into preview cards", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          items: [
            {
              id: {
                videoId: "video-1",
              },
              snippet: {
                title: "Latest Architecture Notes",
                channelTitle: "Engineering Daily",
                thumbnails: {
                  high: { url: "https://i.ytimg.com/vi/video-1/hqdefault.jpg" },
                },
              },
            },
          ],
        }),
        { status: 200 }
      );

    const result = await fetchYouTubeChannelVideos(
      "token-123",
      "UC_ENGINEERING",
      fetchMock
    );

    expect(result).toEqual({
      ok: true,
      items: [
        {
          videoId: "video-1",
          title: "Latest Architecture Notes",
          thumbnailUrl: "https://i.ytimg.com/vi/video-1/hqdefault.jpg",
          channelTitle: "Engineering Daily",
        },
      ],
    });
  });

  test("maps unauthorized channel fetches to reconnect state", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(
        JSON.stringify({ error: { message: "Invalid Credentials" } }),
        { status: 401 }
      );

    const result = await fetchYouTubeChannelVideos(
      "token-123",
      "UC_ENGINEERING",
      fetchMock
    );

    expect(result).toEqual({
      ok: false,
      status: "unauthorized",
      message: "Invalid Credentials",
    });
  });
});
