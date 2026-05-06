import { expect, test } from "@playwright/test";
import { fetchYouTubeSubscriptions } from "../src/youtube/subscriptions-api";

test.describe("YouTube subscriptions API", () => {
  test("aggregates paginated subscriptions", async () => {
    const pageOne = {
      items: [
        {
          snippet: {
            title: "Engineering Daily",
            resourceId: {
              channelId: "UC_ENGINEERING",
            },
          },
        },
      ],
      nextPageToken: "next-token",
    };
    const pageTwo = {
      items: [
        {
          snippet: {
            title: "Travel Notes",
            resourceId: {
              channelId: "UC_TRAVEL",
            },
          },
        },
      ],
    };

    const fetchMock: typeof fetch = async (input) => {
      const url = String(input);
      const payload = url.includes("pageToken=next-token") ? pageTwo : pageOne;
      return new Response(JSON.stringify(payload), { status: 200 });
    };

    const result = await fetchYouTubeSubscriptions("token-123", fetchMock);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.items).toEqual([
      {
        id: "UC_ENGINEERING",
        title: "Engineering Daily",
        url: "https://www.youtube.com/channel/UC_ENGINEERING",
        thumbnailUrl: null,
      },
      {
        id: "UC_TRAVEL",
        title: "Travel Notes",
        url: "https://www.youtube.com/channel/UC_TRAVEL",
        thumbnailUrl: null,
      },
    ]);
    expect(result.nextPageSeen).toBe(true);
  });

  test("maps unauthorized subscription fetches to reconnect state", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(
        JSON.stringify({ error: { message: "Invalid Credentials" } }),
        { status: 401 }
      );

    const result = await fetchYouTubeSubscriptions("token-123", fetchMock);

    expect(result).toEqual({
      ok: false,
      status: "unauthorized",
      message: "Invalid Credentials",
    });
  });
});
