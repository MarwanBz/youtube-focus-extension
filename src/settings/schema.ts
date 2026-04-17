export const SETTINGS_STORAGE_KEY = "youtubeFocusSettings";
export const SETTINGS_STORAGE_AREA = "sync";
export const MAX_MANUAL_PLAYLISTS = 3;

export type PlaylistShortcut = {
  id: string;
  title: string;
  url: string;
};

export type FocusSettings = {
  focusModeEnabled: boolean;
  manualPlaylists: PlaylistShortcut[];
  disabledUntil: string | null;
};

export function normalizeFocusSettings(
  value: unknown,
  fallback: FocusSettings
): FocusSettings {
  if (!isRecord(value)) {
    return cloneFocusSettings(fallback);
  }

  return {
    focusModeEnabled:
      typeof value.focusModeEnabled === "boolean"
        ? value.focusModeEnabled
        : fallback.focusModeEnabled,
    manualPlaylists: normalizePlaylists(value.manualPlaylists),
    disabledUntil:
      typeof value.disabledUntil === "string" || value.disabledUntil === null
        ? value.disabledUntil
        : fallback.disabledUntil,
  };
}

export function cloneFocusSettings(settings: FocusSettings): FocusSettings {
  return {
    ...settings,
    manualPlaylists: settings.manualPlaylists.map((playlist) => ({
      ...playlist,
    })),
  };
}

export function isFocusTemporarilyDisabled(
  settings: FocusSettings,
  now = Date.now()
) {
  if (!settings.disabledUntil) {
    return false;
  }

  const disabledUntil = Date.parse(settings.disabledUntil);
  return Number.isFinite(disabledUntil) && disabledUntil > now;
}

export function isFocusModeActive(settings: FocusSettings, now = Date.now()) {
  return (
    settings.focusModeEnabled && !isFocusTemporarilyDisabled(settings, now)
  );
}

function normalizePlaylists(value: unknown): PlaylistShortcut[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isPlaylistShortcut)
    .slice(0, MAX_MANUAL_PLAYLISTS)
    .map((playlist) => ({ ...playlist }));
}

function isPlaylistShortcut(value: unknown): value is PlaylistShortcut {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    value.title.trim().length > 0 &&
    isSupportedPlaylistUrl(value.url)
  );
}

function isSupportedPlaylistUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.hostname === "www.youtube.com" &&
      url.pathname === "/playlist" &&
      url.searchParams.has("list")
    );
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
