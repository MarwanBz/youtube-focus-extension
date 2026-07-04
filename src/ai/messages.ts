import type {
  RecommendationSticker,
  RecommendationStickerInput,
} from "./sticker-schema";

export const GENERATE_RECOMMENDATION_STICKERS_MESSAGE =
  "youtube-focus/generate-recommendation-stickers";
export const DISMISS_RECOMMENDATION_STICKER_MESSAGE =
  "youtube-focus/dismiss-recommendation-sticker";

export type GenerateRecommendationStickersMessage = {
  type: typeof GENERATE_RECOMMENDATION_STICKERS_MESSAGE;
  suggestions: RecommendationStickerInput[];
};

export type GenerateRecommendationStickersResponse =
  | {
      ok: true;
      status: "ready" | "disabled" | "missing_key" | "empty";
      stickers: RecommendationSticker[];
    }
  | {
      ok: false;
      status: "failed";
      message: string;
      stickers: RecommendationSticker[];
    };

export type DismissRecommendationStickerMessage = {
  type: typeof DISMISS_RECOMMENDATION_STICKER_MESSAGE;
  stickerKey: string;
};

export type DismissRecommendationStickerResponse = {
  ok: true;
};

export function isGenerateRecommendationStickersMessage(
  value: unknown
): value is GenerateRecommendationStickersMessage {
  return (
    isRecord(value) &&
    value.type === GENERATE_RECOMMENDATION_STICKERS_MESSAGE &&
    Array.isArray(value.suggestions)
  );
}

export function isDismissRecommendationStickerMessage(
  value: unknown
): value is DismissRecommendationStickerMessage {
  return (
    isRecord(value) &&
    value.type === DISMISS_RECOMMENDATION_STICKER_MESSAGE &&
    typeof value.stickerKey === "string" &&
    value.stickerKey.length > 0
  );
}

export async function requestRecommendationStickers(
  suggestions: RecommendationStickerInput[]
): Promise<GenerateRecommendationStickersResponse> {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return {
      ok: true,
      status: "disabled",
      stickers: [],
    };
  }

  const message: GenerateRecommendationStickersMessage = {
    type: GENERATE_RECOMMENDATION_STICKERS_MESSAGE,
    suggestions,
  };

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      message,
      (result: GenerateRecommendationStickersResponse | undefined) => {
        const runtimeError = chrome.runtime?.lastError;
        if (runtimeError) {
          resolve({
            ok: false,
            status: "failed",
            message:
              runtimeError.message || "Unable to generate AI stickers.",
            stickers: [],
          });
          return;
        }

        resolve(
          result ?? {
            ok: false,
            status: "failed",
            message: "Unable to generate AI stickers.",
            stickers: [],
          }
        );
      }
    );
  });
}

export async function dismissRecommendationSticker(stickerKey: string) {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return { ok: true as const };
  }

  const message: DismissRecommendationStickerMessage = {
    type: DISMISS_RECOMMENDATION_STICKER_MESSAGE,
    stickerKey,
  };

  return new Promise<DismissRecommendationStickerResponse>((resolve) => {
    chrome.runtime.sendMessage(
      message,
      (result: DismissRecommendationStickerResponse | undefined) => {
        resolve(result ?? { ok: true });
      }
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
