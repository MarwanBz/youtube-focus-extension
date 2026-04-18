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
import {
  getFocusBannerContent,
  type FocusBannerVariant,
} from "./focusBanner";
import { subscribeToUrlChanges } from "./urlChanges";
import {
  getYouTubeRouteState,
  type YouTubeRouteState,
} from "./youtubeHome";

type FocusUiState = {
  focusModeActive: boolean;
  focusModeEnabled: boolean;
  routeState: YouTubeRouteState;
  settings: FocusSettings;
};

export function MastheadFocusToggle() {
  const { focusModeActive, focusModeEnabled, routeState, settings } =
    useFocusUiState();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">(
    "idle"
  );

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
          background: #1f1f1f;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          color: #f1f1f1;
          cursor: pointer;
          display: inline-flex;
          font-family: Roboto, Arial, sans-serif;
          gap: 12px;
          height: 40px;
          justify-content: center;
          line-height: 1;
          padding: 0 14px 0 18px;
          transition: background 120ms ease, border-color 120ms ease, opacity 120ms ease;
          white-space: nowrap;
        }

        .youtube-focus-toggle:hover {
          background: #272727;
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
          border-color: rgba(45, 125, 255, 0.45);
        }

        .youtube-focus-toggle[data-save-state="error"] {
          border-color: rgba(239, 68, 68, 0.75);
        }

        .youtube-focus-toggle__label {
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0;
        }

        .youtube-focus-toggle__switch {
          align-items: center;
          background: #eeeeee;
          border-radius: 999px;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
          display: inline-flex;
          flex: 0 0 auto;
          height: 24px;
          justify-content: flex-start;
          padding: 2px;
          transition: background 140ms ease;
          width: 44px;
        }

        .youtube-focus-toggle[data-enabled="true"] .youtube-focus-toggle__switch {
          background: #2d7dff;
        }

        .youtube-focus-toggle__thumb {
          background: #ffffff;
          border-radius: 999px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.34);
          display: inline-block;
          height: 20px;
          transform: translateX(0);
          transition: transform 140ms ease;
          width: 20px;
        }

        .youtube-focus-toggle[data-enabled="true"] .youtube-focus-toggle__thumb {
          transform: translateX(20px);
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
        <span className="youtube-focus-toggle__label">Focus Mode</span>
        <span className="youtube-focus-toggle__switch" aria-hidden="true">
          <span className="youtube-focus-toggle__thumb" />
        </span>
      </button>
    </>
  );
}

export function HomeFocusBanner() {
  const { focusModeEnabled, routeState } = useFocusUiState();
  const banner = getFocusBannerContent(focusModeEnabled);

  if (!routeState.isHome) {
    return null;
  }

  return (
    <>
      <style>{`
        .youtube-focus-banner {
          align-items: center;
          border: 1px solid;
          border-radius: 18px;
          box-sizing: border-box;
          color: #f1f1f1;
          display: grid;
          font-family: Roboto, Arial, sans-serif;
          gap: 20px;
          grid-template-columns: 64px minmax(0, 1fr);
          margin: 24px 24px 20px;
          padding: 32px;
          width: calc(100% - 48px);
        }

        .youtube-focus-banner[data-variant="off"] {
          background: linear-gradient(180deg, rgba(93, 23, 15, 0.88) 0%, rgba(74, 18, 14, 0.82) 100%);
          border-color: rgba(194, 43, 28, 0.78);
        }

        .youtube-focus-banner[data-variant="on"] {
          background: linear-gradient(180deg, rgba(18, 36, 84, 0.9) 0%, rgba(38, 26, 76, 0.86) 100%);
          border-color: rgba(65, 94, 220, 0.78);
        }

        .youtube-focus-banner__icon-wrap {
          align-items: center;
          border-radius: 999px;
          display: inline-flex;
          height: 64px;
          justify-content: center;
          width: 64px;
        }

        .youtube-focus-banner[data-variant="off"] .youtube-focus-banner__icon-wrap {
          background: #e9231a;
        }

        .youtube-focus-banner[data-variant="on"] .youtube-focus-banner__icon-wrap {
          background: #2f67f3;
        }

        .youtube-focus-banner__icon {
          color: #ffffff;
          display: block;
          height: 30px;
          width: 30px;
        }

        .youtube-focus-banner__title {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0;
          line-height: 1.15;
          margin: 0;
        }

        .youtube-focus-banner__body {
          color: rgba(241, 241, 241, 0.76);
          font-size: 16px;
          font-weight: 400;
          line-height: 1.55;
          margin: 12px 0 0;
        }

        @media (max-width: 900px) {
          .youtube-focus-banner {
            gap: 14px;
            grid-template-columns: 48px minmax(0, 1fr);
            margin: 16px 12px;
            padding: 18px;
            width: calc(100% - 24px);
          }

          .youtube-focus-banner__icon-wrap {
            height: 48px;
            width: 48px;
          }

          .youtube-focus-banner__icon {
            height: 24px;
            width: 24px;
          }

          .youtube-focus-banner__title {
            font-size: 18px;
          }

          .youtube-focus-banner__body {
            font-size: 14px;
            line-height: 1.45;
          }
        }
      `}</style>
      <section
        className="youtube-focus-banner"
        data-variant={banner.variant}
        role="status"
      >
        <span className="youtube-focus-banner__icon-wrap">
          <BannerIcon variant={banner.variant} />
        </span>
        <div>
          <h2 className="youtube-focus-banner__title">{banner.title}</h2>
          <p className="youtube-focus-banner__body">{banner.body}</p>
        </div>
      </section>
    </>
  );
}

export default MastheadFocusToggle;

function BannerIcon({ variant }: { variant: FocusBannerVariant }) {
  if (variant === "on") {
    return (
      <svg
        aria-hidden="true"
        className="youtube-focus-banner__icon"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 3.5 13.8 9l5.7 1.5-5.7 1.7L12 18l-1.8-5.8-5.7-1.7L10.2 9 12 3.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M18 4.5v3M19.5 6h-3"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="youtube-focus-banner__icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 6.5v7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M12 17.5h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function useFocusUiState(): FocusUiState {
  const [settings, setSettings] = useState<FocusSettings>(
    DEFAULT_FOCUS_SETTINGS
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

  return {
    focusModeActive: isFocusModeActive(settings),
    focusModeEnabled: settings.focusModeEnabled,
    routeState,
    settings,
  };
}
