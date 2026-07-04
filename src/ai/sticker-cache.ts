import {
  DEFAULT_AI_STICKER_CACHE_STATE,
  AI_STICKER_CACHE_STORAGE_AREA,
  AI_STICKER_CACHE_STORAGE_KEY,
  cloneAiStickerCacheState,
  normalizeAiStickerCacheState,
  pruneAiStickerCacheState,
  type AiStickerCacheState,
} from "./sticker-schema";

export async function readAiStickerCacheState(): Promise<AiStickerCacheState> {
  const area = getStorageArea();
  if (!area) {
    return cloneAiStickerCacheState(DEFAULT_AI_STICKER_CACHE_STATE);
  }

  return new Promise((resolve) => {
    area.get(AI_STICKER_CACHE_STORAGE_KEY, (items) => {
      resolve(
        normalizeAiStickerCacheState(
          items[AI_STICKER_CACHE_STORAGE_KEY],
          DEFAULT_AI_STICKER_CACHE_STATE
        )
      );
    });
  });
}

export async function writeAiStickerCacheState(
  state: AiStickerCacheState
): Promise<AiStickerCacheState> {
  const normalized = normalizeAiStickerCacheState(state);
  const area = getStorageArea();
  if (!area) {
    return normalized;
  }

  return new Promise((resolve, reject) => {
    area.set({ [AI_STICKER_CACHE_STORAGE_KEY]: normalized }, () => {
      const error = getLastRuntimeError();
      if (error) {
        reject(error);
        return;
      }

      resolve(cloneAiStickerCacheState(normalized));
    });
  });
}

export async function patchAiStickerCacheState(
  patch: Partial<AiStickerCacheState>
): Promise<AiStickerCacheState> {
  const current = await readAiStickerCacheState();
  return writeAiStickerCacheState({ ...current, ...patch });
}

export async function pruneStoredAiStickerCache(
  dateKey: string
): Promise<AiStickerCacheState> {
  const current = await readAiStickerCacheState();
  return writeAiStickerCacheState(pruneAiStickerCacheState(current, dateKey));
}

function getStorageArea(): chrome.storage.StorageArea | null {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return null;
  }

  return chrome.storage.local;
}

function getLastRuntimeError() {
  if (typeof chrome === "undefined") {
    return null;
  }

  return chrome.runtime?.lastError ?? null;
}

export { AI_STICKER_CACHE_STORAGE_AREA };
