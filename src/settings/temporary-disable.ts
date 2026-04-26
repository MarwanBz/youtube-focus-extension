import {
  isFocusTemporarilyDisabled,
  type FocusSettings,
} from "./schema";

export const TEMPORARY_DISABLE_PRESET_MINUTES = [15, 30, 60] as const;

export type TemporaryDisablePresetMinutes =
  (typeof TEMPORARY_DISABLE_PRESET_MINUTES)[number];

export type TemporaryDisableUiState = {
  isPaused: boolean;
  pausedUntilText: string | null;
  showPauseActions: boolean;
  showResumeAction: boolean;
  statusText: string | null;
};

export function createTemporaryDisableUntilIso(
  minutes: TemporaryDisablePresetMinutes,
  now = Date.now()
) {
  return new Date(now + minutes * 60_000).toISOString();
}

export function getTemporaryDisableExpiresAt(disabledUntil: string | null) {
  if (!disabledUntil) {
    return null;
  }

  const expiresAt = Date.parse(disabledUntil);
  return Number.isFinite(expiresAt) ? expiresAt : null;
}

export function getTemporaryDisableDelayMs(
  disabledUntil: string | null,
  now = Date.now()
) {
  const expiresAt = getTemporaryDisableExpiresAt(disabledUntil);
  if (expiresAt === null) {
    return null;
  }

  return Math.max(0, expiresAt - now);
}

export function formatTemporaryDisableUntil(
  disabledUntil: string | null,
  formatter: (date: Date) => string = defaultTimeFormatter
) {
  const expiresAt = getTemporaryDisableExpiresAt(disabledUntil);
  if (expiresAt === null) {
    return null;
  }

  return formatter(new Date(expiresAt));
}

export function getTemporaryDisableBadgeText(
  disabledUntil: string | null,
  now = Date.now()
) {
  const delay = getTemporaryDisableDelayMs(disabledUntil, now);
  if (delay === null || delay <= 0) {
    return "";
  }

  const remainingMinutes = Math.max(1, Math.ceil(delay / 60_000));
  if (remainingMinutes < 60) {
    return `${remainingMinutes}\u1D50`;
  }

  const remainingHours = Math.ceil(remainingMinutes / 60);
  return `${remainingHours}\u02B0`;
}

export function getTemporaryDisableUiState(
  settings: FocusSettings,
  options?: {
    now?: number;
    formatter?: (date: Date) => string;
  }
): TemporaryDisableUiState {
  const now = options?.now ?? Date.now();
  const isPaused =
    settings.focusModeEnabled && isFocusTemporarilyDisabled(settings, now);
  const pausedUntilText = isPaused
    ? formatTemporaryDisableUntil(settings.disabledUntil, options?.formatter)
    : null;

  return {
    isPaused,
    pausedUntilText,
    showPauseActions: settings.focusModeEnabled && !isPaused,
    showResumeAction: isPaused,
    statusText: pausedUntilText ? `Paused until ${pausedUntilText}` : null,
  };
}

function defaultTimeFormatter(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
