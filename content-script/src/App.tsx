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
import { syncHomeFeedVisibility } from "./feedVisibility";
import {
  getFocusBannerContent,
  type FocusBannerVariant,
} from "./focusBanner";
import { subscribeToUrlChanges } from "./urlChanges";
import {
  getYouTubeRouteState,
  type YouTubeRouteState,
} from "./youtubeHome";
import {
  getFocusOverlaySources,
  shouldRenderHomeFocusOverlay,
} from "./focusOverlay";

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
  const { focusModeActive, focusModeEnabled, routeState } = useFocusUiState();
  const banner = getFocusBannerContent(focusModeEnabled);

  useEffect(() => {
    const sync = () => {
      syncHomeFeedVisibility(document, routeState.isHome && focusModeActive);
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      syncHomeFeedVisibility(document, false);
    };
  }, [focusModeActive, routeState.isHome]);

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

export function HomeFocusOverlay() {
  const { focusModeActive, routeState, settings } = useFocusUiState();
  const sources = getFocusOverlaySources(settings);
  const hasManualPlaylists = settings.manualPlaylists.length > 0;

  if (!shouldRenderHomeFocusOverlay(routeState, focusModeActive)) {
    return null;
  }

  const handleOpenSettings = () => {
    if (typeof chrome === "undefined") {
      return;
    }

    if (chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
      return;
    }

    if (chrome.runtime?.getURL) {
      window.open(chrome.runtime.getURL("options.html"));
    }
  };

  return (
    <>
      <style>{`
        .youtube-focus-overlay {
          box-sizing: border-box;
          color: #f1f1f1;
          font-family: Roboto, Arial, sans-serif;
          margin: 0 24px 24px;
          width: calc(100% - 48px);
        }

        .youtube-focus-overlay__panel {
          background: linear-gradient(180deg, rgba(16, 18, 23, 0.96) 0%, rgba(23, 26, 35, 0.94) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          box-sizing: border-box;
          display: grid;
          gap: 18px;
          grid-template-columns: minmax(0, 1fr) auto;
          padding: 24px;
          width: 100%;
        }

        .youtube-focus-overlay__eyebrow {
          color: rgba(125, 162, 255, 0.92);
          display: block;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0;
          margin-bottom: 10px;
          text-transform: uppercase;
        }

        .youtube-focus-overlay__title {
          font-size: 30px;
          font-weight: 700;
          letter-spacing: 0;
          line-height: 1.12;
          margin: 0;
        }

        .youtube-focus-overlay__body {
          color: rgba(241, 241, 241, 0.72);
          font-size: 15px;
          line-height: 1.55;
          margin: 12px 0 0;
          max-width: 56ch;
        }

        .youtube-focus-overlay__aside {
          align-items: flex-start;
          display: grid;
          gap: 12px;
          justify-items: end;
          min-width: 220px;
        }

        .youtube-focus-overlay__card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          display: grid;
          gap: 8px;
          min-height: 108px;
          padding: 16px;
          width: 100%;
        }

        .youtube-focus-overlay__card-title {
          font-size: 15px;
          font-weight: 600;
          margin: 0;
        }

        .youtube-focus-overlay__card-body {
          color: rgba(241, 241, 241, 0.64);
          font-size: 13px;
          line-height: 1.5;
          margin: 0;
        }

        .youtube-focus-overlay__sources {
          display: grid;
          gap: 10px;
          margin-top: 20px;
        }

        .youtube-focus-overlay__source {
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: inherit;
          column-gap: 14px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          padding: 14px 16px;
          text-decoration: none;
          transition: background 120ms ease, border-color 120ms ease;
        }

        .youtube-focus-overlay__source:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(125, 162, 255, 0.32);
        }

        .youtube-focus-overlay__source:focus-visible {
          outline: 2px solid #ffffff;
          outline-offset: 2px;
        }

        .youtube-focus-overlay__source-icon {
          align-items: center;
          background: rgba(45, 125, 255, 0.18);
          border-radius: 999px;
          color: #a9c3ff;
          display: inline-flex;
          flex: 0 0 auto;
          font-size: 11px;
          font-weight: 700;
          height: 28px;
          justify-content: center;
          text-transform: uppercase;
          width: 28px;
        }

        .youtube-focus-overlay__source-meta {
          min-width: 0;
        }

        .youtube-focus-overlay__source-title {
          display: block;
          font-size: 14px;
          font-weight: 600;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .youtube-focus-overlay__source-subtitle {
          color: rgba(241, 241, 241, 0.56);
          display: block;
          font-size: 12px;
          margin-top: 3px;
        }

        .youtube-focus-overlay__source-arrow {
          color: rgba(241, 241, 241, 0.44);
          font-size: 18px;
          line-height: 1;
        }

        .youtube-focus-overlay__empty {
          color: rgba(241, 241, 241, 0.64);
          font-size: 13px;
          line-height: 1.5;
          margin: 2px 0 0;
        }

        .youtube-focus-overlay__button {
          background: #2d7dff;
          border: 0;
          border-radius: 8px;
          color: #ffffff;
          cursor: pointer;
          font: inherit;
          font-size: 14px;
          font-weight: 600;
          min-height: 40px;
          padding: 0 16px;
          transition: background 120ms ease, opacity 120ms ease;
        }

        .youtube-focus-overlay__button:hover {
          background: #4a92ff;
        }

        .youtube-focus-overlay__button:focus-visible {
          outline: 2px solid #ffffff;
          outline-offset: 2px;
        }

        @media (max-width: 900px) {
          .youtube-focus-overlay {
            margin: 0 12px 16px;
            width: calc(100% - 24px);
          }

          .youtube-focus-overlay__panel {
            grid-template-columns: minmax(0, 1fr);
            padding: 18px;
          }

          .youtube-focus-overlay__title {
            font-size: 24px;
          }

          .youtube-focus-overlay__aside {
            justify-items: stretch;
            min-width: 0;
          }

          .youtube-focus-overlay__card {
            min-height: 0;
          }
        }
      `}</style>
      <section
        className="youtube-focus-overlay"
        data-testid="youtube-focus-overlay"
      >
        <div className="youtube-focus-overlay__panel">
          <div>
            <span className="youtube-focus-overlay__eyebrow">Focus Home</span>
            <h2 className="youtube-focus-overlay__title">
              Your intentional queue starts here.
            </h2>
            <p className="youtube-focus-overlay__body">
              This space now points you toward the list you chose to save on
              purpose. Watch Later is ready below, and your saved playlist
              shortcuts will appear here instead of the recommendation feed.
            </p>
            <div className="youtube-focus-overlay__sources">
              {sources.map((source) => (
                <a
                  key={`${source.kind}:${source.url}`}
                  className="youtube-focus-overlay__source"
                  data-kind={source.kind}
                  href={source.url}
                >
                  <span className="youtube-focus-overlay__source-icon">
                    {source.kind === "watch-later" ? "WL" : "PL"}
                  </span>
                  <span className="youtube-focus-overlay__source-meta">
                    <span className="youtube-focus-overlay__source-title">
                      {source.title}
                    </span>
                    <span className="youtube-focus-overlay__source-subtitle">
                      {source.kind === "watch-later"
                        ? "Your quick return lane for saved videos."
                        : "Manual playlist shortcut"}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="youtube-focus-overlay__source-arrow"
                  >
                    ›
                  </span>
                </a>
              ))}
            </div>
          </div>
          <div className="youtube-focus-overlay__aside">
            <div className="youtube-focus-overlay__card">
              <p className="youtube-focus-overlay__card-title">
                {hasManualPlaylists ? "Playlist shortcuts are live" : "Add your playlists next"}
              </p>
              <p className="youtube-focus-overlay__card-body">
                {hasManualPlaylists
                  ? "Your saved shortcuts now show up here. T009 will make editing them easier from Settings."
                  : "Watch Later is ready, and you can add up to three manual playlist shortcuts in Settings."}
              </p>
              {!hasManualPlaylists ? (
                <p className="youtube-focus-overlay__empty">
                  No playlist shortcuts yet. Add a few focused lists so this
                  surface reflects what you actually want to watch.
                </p>
              ) : null}
            </div>
            <button
              className="youtube-focus-overlay__button"
              type="button"
              onClick={handleOpenSettings}
            >
              Open Settings
            </button>
          </div>
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
