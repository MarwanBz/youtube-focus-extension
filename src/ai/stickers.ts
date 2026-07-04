import { createOpenAI, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { AiSettings } from "@/settings/ai";
import type { FocusSettings } from "@/settings/schema";
import { getPersonaPresetLabel } from "@/settings/persona";
import {
  MAX_RECOMMENDATION_STICKER_REQUESTS,
  MAX_STICKER_TEXT_LENGTH,
  type RecommendationSticker,
  type RecommendationStickerDismissal,
  type RecommendationStickerInput,
} from "./sticker-schema";

export type StickerGenerationInput = {
  item: RecommendationStickerInput;
  settings: FocusSettings;
  aiSettings: AiSettings;
  dateKey?: string;
  now?: Date;
};

export type StickerTextGenerator = (input: {
  apiKey: string;
  model: string;
  prompt: string;
}) => Promise<string>;

export function getAiStickerDateKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function createRecommendationStickerKey(
  item: RecommendationStickerInput,
  dateKey = getAiStickerDateKey()
) {
  return [
    dateKey,
    normalizeCachePart(item.title),
    normalizeCachePart(item.channelTitle ?? ""),
    normalizeHref(item.href),
  ].join("|");
}

export function limitRecommendationStickerInputs(
  items: RecommendationStickerInput[]
) {
  return items
    .filter((item) => item.title.trim().length > 0)
    .slice(0, MAX_RECOMMENDATION_STICKER_REQUESTS)
    .map((item) => ({
      title: item.title.trim(),
      channelTitle: item.channelTitle?.trim() || null,
      href: item.href?.trim() || null,
    }));
}

export function isStickerDismissed(
  dismissals: RecommendationStickerDismissal[],
  key: string,
  dateKey: string
) {
  return dismissals.some(
    (dismissal) => dismissal.key === key && dismissal.dateKey === dateKey
  );
}

export function findCachedSticker(
  stickers: RecommendationSticker[],
  key: string,
  dateKey: string
) {
  return stickers.find(
    (sticker) => sticker.key === key && sticker.dateKey === dateKey
  );
}

export function buildRecommendationStickerPrompt(
  item: RecommendationStickerInput,
  settings: FocusSettings
) {
  const channelLine = item.channelTitle
    ? `Channel: ${item.channelTitle}`
    : "Channel: Unknown";
  const profanityRule = settings.allowMildProfanity
    ? "Mild casual profanity is allowed, but never insults, slurs, or hateful language."
    : "Do not use profanity.";
  const customLine =
    settings.personaPreset === "custom" && settings.customPersonaInstruction
      ? `Custom voice instruction: ${settings.customPersonaInstruction}`
      : "";

  return [
    "Write one compact anti-distraction sticker for a YouTube recommendation.",
    "The sticker should help the user notice the temptation and return to their chosen video.",
    "Return only the sticker text. No quotes. No emoji. No markdown.",
    `Keep it under ${MAX_STICKER_TEXT_LENGTH} characters.`,
    `Persona: ${getPersonaPresetLabel(settings.personaPreset)}.`,
    `Tone sliders: funny ${settings.personaSliders.funny}/10, strict ${settings.personaSliders.strict}/10, kind ${settings.personaSliders.kind}/10.`,
    profanityRule,
    customLine,
    `Recommendation title: ${item.title}`,
    channelLine,
  ]
    .filter(Boolean)
    .join("\n");
}

export function normalizeStickerText(value: string) {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_STICKER_TEXT_LENGTH);
}

export async function generateRecommendationSticker(
  input: StickerGenerationInput,
  generateStickerText: StickerTextGenerator = generateStickerTextWithAiSdk
): Promise<RecommendationSticker | null> {
  const dateKey = input.dateKey ?? getAiStickerDateKey(input.now);
  const prompt = buildRecommendationStickerPrompt(input.item, input.settings);
  const text = normalizeStickerText(
    await generateStickerText({
      apiKey: input.aiSettings.apiKey,
      model: input.aiSettings.model,
      prompt,
    })
  );

  if (!text) {
    return null;
  }

  return {
    ...input.item,
    key: createRecommendationStickerKey(input.item, dateKey),
    text,
    dateKey,
    updatedAt: (input.now ?? new Date()).toISOString(),
  };
}

export async function generateStickerTextWithAiSdk({
  apiKey,
  model,
  prompt,
}: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const openai = createOpenAI({ apiKey });
  const result = await generateText({
    model: openai(model),
    prompt,
    maxOutputTokens: 96,
    providerOptions: {
      openai: {
        store: false,
        parallelToolCalls: false,
        reasoningEffort: "minimal",
        textVerbosity: "low",
      } satisfies OpenAILanguageModelResponsesOptions,
    },
  });

  return result.text;
}

function normalizeCachePart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeHref(value: string | null) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    const videoId = url.searchParams.get("v");
    return videoId ? `v=${videoId}` : `${url.pathname}${url.search}`;
  } catch {
    return normalizeCachePart(value);
  }
}
