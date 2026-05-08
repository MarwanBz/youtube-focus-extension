import type { FocusSettings } from "./schema";
import {
  DEFAULT_PERSONA_PRESET,
  getPersonaPresetSliders,
} from "./persona";

export const DEFAULT_FOCUS_SETTINGS: FocusSettings = {
  focusModeEnabled: false,
  manualPlaylists: [],
  importedPlaylists: [],
  selectedChannels: [],
  disabledUntil: null,
  personaPreset: DEFAULT_PERSONA_PRESET,
  personaSliders: getPersonaPresetSliders(DEFAULT_PERSONA_PRESET),
  customPersonaInstruction: "",
  allowMildProfanity: true,
};
