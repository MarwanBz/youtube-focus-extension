export const PERSONA_PRESETS = ["funny", "strict", "calm", "custom"] as const;
export const PERSONA_SLIDER_MIN = 0;
export const PERSONA_SLIDER_MAX = 10;
export const CUSTOM_PERSONA_INSTRUCTION_MAX_LENGTH = 280;

export type PersonaPreset = (typeof PERSONA_PRESETS)[number];

export type PersonaSliders = {
  funny: number;
  strict: number;
  kind: number;
};

export type PersonaPreviewInput = {
  personaPreset: PersonaPreset;
  personaSliders: PersonaSliders;
  customPersonaInstruction: string;
};

export const DEFAULT_PERSONA_PRESET: PersonaPreset = "funny";

export const PERSONA_PRESET_SLIDERS: Record<PersonaPreset, PersonaSliders> = {
  funny: {
    funny: 8,
    strict: 5,
    kind: 5,
  },
  strict: {
    funny: 2,
    strict: 9,
    kind: 4,
  },
  calm: {
    funny: 1,
    strict: 2,
    kind: 9,
  },
  custom: {
    funny: 6,
    strict: 5,
    kind: 6,
  },
};

export const DEFAULT_PERSONA_SLIDERS =
  PERSONA_PRESET_SLIDERS[DEFAULT_PERSONA_PRESET];

export function getPersonaPresetSliders(
  preset: PersonaPreset
): PersonaSliders {
  return { ...PERSONA_PRESET_SLIDERS[preset] };
}

export function normalizePersonaPreset(
  value: unknown,
  fallback: PersonaPreset = DEFAULT_PERSONA_PRESET
): PersonaPreset {
  return typeof value === "string" && isPersonaPreset(value)
    ? value
    : fallback;
}

export function normalizePersonaSliders(
  value: unknown,
  fallback: PersonaSliders = DEFAULT_PERSONA_SLIDERS
): PersonaSliders {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  return {
    funny: normalizeSliderValue(value.funny, fallback.funny),
    strict: normalizeSliderValue(value.strict, fallback.strict),
    kind: normalizeSliderValue(value.kind, fallback.kind),
  };
}

export function normalizeCustomPersonaInstruction(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, CUSTOM_PERSONA_INSTRUCTION_MAX_LENGTH);
}

export function getPersonaPreviewText(input: PersonaPreviewInput) {
  const { funny, strict, kind } = input.personaSliders;

  if (input.personaPreset === "custom" && input.customPersonaInstruction) {
    return `Custom voice noted: ${input.customPersonaInstruction}`;
  }

  if (funny >= 7 && strict >= 7) {
    return "That recommendation is wearing a tiny emergency siren. Finish what you opened first.";
  }

  if (funny >= 7) {
    return "The sidebar is doing jazz hands for your attention. Cute effort. Back to the video.";
  }

  if (strict >= 7) {
    return "Do not open the detour. Stay with the video you chose.";
  }

  if (kind >= 7) {
    return "Stay with the choice you already made. The next click can wait.";
  }

  return "Notice the pull, then return to the video you meant to watch.";
}

export function getPersonaPresetLabel(preset: PersonaPreset) {
  if (preset === "funny") {
    return "Funny";
  }

  if (preset === "strict") {
    return "Strict";
  }

  if (preset === "calm") {
    return "Calm";
  }

  return "Custom";
}

function isPersonaPreset(value: string): value is PersonaPreset {
  return PERSONA_PRESETS.includes(value as PersonaPreset);
}

function normalizeSliderValue(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(
    PERSONA_SLIDER_MAX,
    Math.max(PERSONA_SLIDER_MIN, Math.round(value))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
