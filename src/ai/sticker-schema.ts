export const AI_STICKER_CACHE_STORAGE_KEY = "youtubeFocusAiStickerCache";
export const AI_STICKER_CACHE_STORAGE_AREA = "local";
export const MAX_RECOMMENDATION_STICKER_REQUESTS = 8;
export const MAX_STICKER_TEXT_LENGTH = 96;
export const MAX_STICKER_CACHE_ENTRIES = 160;
export const MAX_STICKER_DISMISSALS = 240;

export type RecommendationStickerInput = {
  title: string;
  channelTitle: string | null;
  href: string | null;
};

export type RecommendationSticker = RecommendationStickerInput & {
  key: string;
  text: string;
  dateKey: string;
  updatedAt: string;
};

export type RecommendationStickerDismissal = {
  key: string;
  dateKey: string;
  dismissedAt: string;
};

export type AiStickerCacheState = {
  stickers: RecommendationSticker[];
  dismissals: RecommendationStickerDismissal[];
  updatedAt: string | null;
};

export const DEFAULT_AI_STICKER_CACHE_STATE: AiStickerCacheState = {
  stickers: [],
  dismissals: [],
  updatedAt: null,
};

export function normalizeAiStickerCacheState(
  value: unknown,
  fallback: AiStickerCacheState = DEFAULT_AI_STICKER_CACHE_STATE
): AiStickerCacheState {
  if (!isRecord(value)) {
    return cloneAiStickerCacheState(fallback);
  }

  return {
    stickers: normalizeStickerEntries(value.stickers),
    dismissals: normalizeDismissals(value.dismissals),
    updatedAt:
      typeof value.updatedAt === "string" && value.updatedAt.length > 0
        ? value.updatedAt
        : null,
  };
}

export function cloneAiStickerCacheState(
  state: AiStickerCacheState
): AiStickerCacheState {
  return {
    updatedAt: state.updatedAt,
    stickers: state.stickers.map((sticker) => ({ ...sticker })),
    dismissals: state.dismissals.map((dismissal) => ({ ...dismissal })),
  };
}

export function pruneAiStickerCacheState(
  state: AiStickerCacheState,
  dateKey: string
): AiStickerCacheState {
  return {
    updatedAt: state.updatedAt,
    stickers: state.stickers
      .filter((sticker) => sticker.dateKey === dateKey)
      .slice(-MAX_STICKER_CACHE_ENTRIES)
      .map((sticker) => ({ ...sticker })),
    dismissals: state.dismissals
      .filter((dismissal) => dismissal.dateKey === dateKey)
      .slice(-MAX_STICKER_DISMISSALS)
      .map((dismissal) => ({ ...dismissal })),
  };
}

function normalizeStickerEntries(value: unknown): RecommendationSticker[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecommendationSticker)
    .slice(-MAX_STICKER_CACHE_ENTRIES)
    .map((sticker) => ({ ...sticker }));
}

function normalizeDismissals(value: unknown): RecommendationStickerDismissal[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecommendationStickerDismissal)
    .slice(-MAX_STICKER_DISMISSALS)
    .map((dismissal) => ({ ...dismissal }));
}

function isRecommendationSticker(value: unknown): value is RecommendationSticker {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.key === "string" &&
    value.key.length > 0 &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    (typeof value.channelTitle === "string" || value.channelTitle === null) &&
    (typeof value.href === "string" || value.href === null) &&
    typeof value.text === "string" &&
    value.text.trim().length > 0 &&
    value.text.length <= MAX_STICKER_TEXT_LENGTH &&
    typeof value.dateKey === "string" &&
    value.dateKey.length > 0 &&
    typeof value.updatedAt === "string" &&
    value.updatedAt.length > 0
  );
}

function isRecommendationStickerDismissal(
  value: unknown
): value is RecommendationStickerDismissal {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.key === "string" &&
    value.key.length > 0 &&
    typeof value.dateKey === "string" &&
    value.dateKey.length > 0 &&
    typeof value.dismissedAt === "string" &&
    value.dismissedAt.length > 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
