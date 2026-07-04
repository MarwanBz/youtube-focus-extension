import { expect, test } from "@playwright/test";
import { DEFAULT_AI_SETTINGS } from "../src/settings/ai";
import { DEFAULT_FOCUS_SETTINGS } from "../src/settings/defaults";
import {
  MAX_RECOMMENDATION_STICKER_REQUESTS,
  normalizeAiStickerCacheState,
  pruneAiStickerCacheState,
} from "../src/ai/sticker-schema";
import {
  buildRecommendationStickerPrompt,
  createRecommendationStickerKey,
  findCachedSticker,
  generateRecommendationSticker,
  getAiStickerDateKey,
  isStickerDismissed,
  limitRecommendationStickerInputs,
  normalizeStickerText,
} from "../src/ai/stickers";
import {
  isDismissRecommendationStickerMessage,
  isGenerateRecommendationStickersMessage,
  GENERATE_RECOMMENDATION_STICKERS_MESSAGE,
  DISMISS_RECOMMENDATION_STICKER_MESSAGE,
} from "../src/ai/messages";

test.describe.skip("AI recommendation stickers", () => {
  test("creates stable daily cache keys from recommendation metadata", () => {
    const first = createRecommendationStickerKey(
      {
        title: "  Deep   Work Tips ",
        channelTitle: "Focus Lab",
        href: "https://www.youtube.com/watch?v=abc123&list=queue",
      },
      "2026-05-08"
    );
    const second = createRecommendationStickerKey(
      {
        title: "deep work tips",
        channelTitle: " focus lab ",
        href: "https://www.youtube.com/watch?v=abc123",
      },
      "2026-05-08"
    );

    expect(first).toBe(second);
  });

  test("uses the current UTC date as the sticker date key", () => {
    expect(getAiStickerDateKey(new Date("2026-05-08T21:00:00.000Z"))).toBe(
      "2026-05-08"
    );
  });

  test("limits generation input to the first eight titled suggestions", () => {
    const items = Array.from({ length: MAX_RECOMMENDATION_STICKER_REQUESTS + 3 }, (_, index) => ({
      title: index === 1 ? " " : `Video ${index}`,
      channelTitle: "Channel",
      href: `https://www.youtube.com/watch?v=${index}`,
    }));

    expect(limitRecommendationStickerInputs(items)).toHaveLength(
      MAX_RECOMMENDATION_STICKER_REQUESTS
    );
  });

  test("builds a persona-shaped prompt without markdown requirements leaking", () => {
    const prompt = buildRecommendationStickerPrompt(
      {
        title: "Deep Work Tips",
        channelTitle: "Focus Lab",
        href: "https://www.youtube.com/watch?v=abc123",
      },
      {
        ...DEFAULT_FOCUS_SETTINGS,
        personaPreset: "custom",
        customPersonaInstruction: "playful coach",
        allowMildProfanity: false,
      }
    );

    expect(prompt).toContain("Deep Work Tips");
    expect(prompt).toContain("Focus Lab");
    expect(prompt).toContain("playful coach");
    expect(prompt).toContain("Do not use profanity.");
    expect(prompt).toContain("No markdown.");
  });

  test("normalizes generated sticker text into a compact single line", () => {
    expect(
      normalizeStickerText(`"  Stay here.\nThe sidebar can wait.  "`)
    ).toBe("Stay here. The sidebar can wait.");
    expect(normalizeStickerText("x".repeat(140))).toHaveLength(96);
  });

  test("generates a normalized sticker with an injected generator", async () => {
    const sticker = await generateRecommendationSticker(
      {
        item: {
          title: "Deep Work Tips",
          channelTitle: "Focus Lab",
          href: "https://www.youtube.com/watch?v=abc123",
        },
        settings: DEFAULT_FOCUS_SETTINGS,
        aiSettings: {
          ...DEFAULT_AI_SETTINGS,
          enabled: true,
          apiKey: "sk-test",
        },
        dateKey: "2026-05-08",
        now: new Date("2026-05-08T21:00:00.000Z"),
      },
      async () => `"Sidebar bait detected. Stay with the video."`
    );

    expect(sticker).toMatchObject({
      title: "Deep Work Tips",
      channelTitle: "Focus Lab",
      text: "Sidebar bait detected. Stay with the video.",
      dateKey: "2026-05-08",
    });
  });

  test("finds cached stickers and skips dismissed keys for the same day", () => {
    const key = "2026-05-08|deep work|focus lab|v=abc";
    const cached = {
      key,
      title: "Deep Work",
      channelTitle: "Focus Lab",
      href: "https://www.youtube.com/watch?v=abc",
      text: "Stay with this one.",
      dateKey: "2026-05-08",
      updatedAt: "2026-05-08T21:00:00.000Z",
    };

    expect(findCachedSticker([cached], key, "2026-05-08")).toEqual(cached);
    expect(
      isStickerDismissed(
        [{ key, dateKey: "2026-05-08", dismissedAt: "2026-05-08T21:00:00.000Z" }],
        key,
        "2026-05-08"
      )
    ).toBe(true);
    expect(
      isStickerDismissed(
        [{ key, dateKey: "2026-05-07", dismissedAt: "2026-05-07T21:00:00.000Z" }],
        key,
        "2026-05-08"
      )
    ).toBe(false);
  });

  test("normalizes and prunes cache entries by daily window", () => {
    const normalized = normalizeAiStickerCacheState({
      stickers: [
        {
          key: "old",
          title: "Old",
          channelTitle: null,
          href: null,
          text: "Old sticker",
          dateKey: "2026-05-07",
          updatedAt: "2026-05-07T21:00:00.000Z",
        },
        {
          key: "new",
          title: "New",
          channelTitle: null,
          href: null,
          text: "New sticker",
          dateKey: "2026-05-08",
          updatedAt: "2026-05-08T21:00:00.000Z",
        },
      ],
      dismissals: [
        {
          key: "old",
          dateKey: "2026-05-07",
          dismissedAt: "2026-05-07T21:00:00.000Z",
        },
        {
          key: "new",
          dateKey: "2026-05-08",
          dismissedAt: "2026-05-08T21:00:00.000Z",
        },
      ],
      updatedAt: "2026-05-08T21:00:00.000Z",
    });

    const pruned = pruneAiStickerCacheState(normalized, "2026-05-08");

    expect(pruned.stickers.map((sticker) => sticker.key)).toEqual(["new"]);
    expect(pruned.dismissals.map((dismissal) => dismissal.key)).toEqual(["new"]);
  });

  test("recognizes sticker generation and dismissal messages", () => {
    expect(
      isGenerateRecommendationStickersMessage({
        type: GENERATE_RECOMMENDATION_STICKERS_MESSAGE,
        suggestions: [],
      })
    ).toBe(true);
    expect(
      isDismissRecommendationStickerMessage({
        type: DISMISS_RECOMMENDATION_STICKER_MESSAGE,
        stickerKey: "2026-05-08|video",
      })
    ).toBe(true);
  });
});
