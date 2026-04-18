import { useEffect, useState } from "react";
import { DEFAULT_FOCUS_SETTINGS } from "@/settings/defaults";
import {
  patchFocusSettings,
  subscribeToFocusSettings,
} from "@/settings/storage";
import {
  isFocusModeActive,
  type FocusSettings,
} from "@/settings/schema";
import { EXTENSION_HOST_ID } from "./domIds";
import { subscribeToUrlChanges } from "./urlChanges";
import {
  getYouTubeRouteState,
  type YouTubeRouteState,
} from "./youtubeHome";

export default function App() {
  const [settings, setSettings] = useState<FocusSettings>(
    DEFAULT_FOCUS_SETTINGS
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">(
    "idle"
  );
  const [routeState, setRouteState] = useState<YouTubeRouteState>(() =>
    getYouTubeRouteState(window.location.href)
  );

  useEffect(() => {
    return subscribeToFocusSettings(setSettings);
  }, []);

  useEffect(() => {
    return subscribeToUrlChanges((url) => {
      setRouteState(getYouTubeRouteState(url));
    });
  }, []);

  const focusModeActive = isFocusModeActive(settings);
  const focusModeEnabled = settings.focusModeEnabled;

  useEffect(() => {
    const host = document.getElementById(EXTENSION_HOST_ID);
    if (!host) {
      return;
    }

    host.dataset.youtubeFocusRoute = routeState.kind;
    host.dataset.youtubeFocusIsHome = String(routeState.isHome);
    host.dataset.youtubeFocusActive = String(focusModeActive);
  }, [focusModeActive, routeState]);

  const handleToggleFocus = () => {
    if (saveState === "saving") {
      return;
    }

    const focusModeEnabled = !settings.focusModeEnabled;
    setSaveState("saving");

    void patchFocusSettings({
      focusModeEnabled,
      disabledUntil: focusModeEnabled ? null : settings.disabledUntil,
    })
      .then(() => setSaveState("idle"))
      .catch(() => setSaveState("error"));
  };

  return (
    <>
      <style>{`
        .youtube-focus-toggle {
          align-items: center;
          background: var(--yt-spec-badge-chip-background, rgba(0, 0, 0, 0.05));
          border: 1px solid var(--yt-spec-10-percent-layer, rgba(0, 0, 0, 0.1));
          border-radius: 8px;
          color: var(--yt-spec-text-primary, #0f0f0f);
          cursor: pointer;
          display: inline-flex;
          font-family: Roboto, Arial, sans-serif;
          font-size: 14px;
          font-weight: 500;
          gap: 8px;
          height: 36px;
          justify-content: center;
          line-height: 20px;
          padding: 0 11px;
          transition: background 120ms ease, border-color 120ms ease, opacity 120ms ease;
          white-space: nowrap;
        }

        .youtube-focus-toggle:hover {
          background: var(--yt-spec-button-chip-background-hover, rgba(0, 0, 0, 0.1));
        }

        .youtube-focus-toggle:focus-visible {
          outline: 2px solid #3ea6ff;
          outline-offset: 2px;
        }

        .youtube-focus-toggle:disabled {
          cursor: default;
          opacity: 0.68;
        }

        .youtube-focus-toggle[data-enabled="true"] {
          background: rgba(34, 197, 94, 0.12);
          border-color: rgba(34, 197, 94, 0.48);
        }

        .youtube-focus-toggle[data-save-state="error"] {
          border-color: rgba(239, 68, 68, 0.75);
        }

        .youtube-focus-toggle__box {
          align-items: center;
          border: 1.5px solid var(--yt-spec-text-secondary, #606060);
          border-radius: 4px;
          color: transparent;
          display: inline-flex;
          flex: 0 0 auto;
          height: 16px;
          justify-content: center;
          transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
          width: 16px;
        }

        .youtube-focus-toggle[data-enabled="true"] .youtube-focus-toggle__box {
          background: #16a34a;
          border-color: #16a34a;
          color: #ffffff;
        }

        .youtube-focus-toggle__check {
          height: 12px;
          width: 12px;
        }
      `}</style>
      <button
        aria-label={
          focusModeEnabled ? "Turn focus mode off" : "Turn focus mode on"
        }
        aria-pressed={focusModeEnabled}
        className="youtube-focus-toggle"
        data-enabled={String(focusModeEnabled)}
        data-route={routeState.kind}
        data-save-state={saveState}
        disabled={saveState === "saving"}
        title={
          saveState === "error"
            ? "Focus setting could not be saved"
            : focusModeActive
              ? "Focus mode is active"
              : "Focus mode is off"
        }
        type="button"
        onClick={handleToggleFocus}
      >
        <span className="youtube-focus-toggle__box" aria-hidden="true">
          <svg
            className="youtube-focus-toggle__check"
            fill="none"
            viewBox="0 0 16 16"
          >
            <path
              d="M3.5 8.2 6.6 11.3 12.8 4.7"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </span>
        <span>Focus</span>
      </button>
    </>
  );
}
