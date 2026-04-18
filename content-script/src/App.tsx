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
import {
  DEFAULT_YOUTUBE_PLAYLIST_STATE,
  type YouTubePlaylistState,
} from "@/youtube/schema";
import { subscribeToYouTubePlaylistState } from "@/youtube/storage";
import {
  DEFAULT_YOUTUBE_PLAYLIST_PREVIEW_STATE,
  type YouTubePlaylistPreviewState,
} from "@/youtube/preview-schema";
import { subscribeToYouTubePlaylistPreviewState } from "@/youtube/preview-storage";
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
  getFocusOverlaySections,
  shouldRenderHomeFocusOverlay,
} from "./focusOverlay";

type FocusUiState = {
  focusModeActive: boolean;
  focusModeEnabled: boolean;
  routeState: YouTubeRouteState;
  settings: FocusSettings;
  playlistState: YouTubePlaylistState;
  playlistPreviewState: YouTubePlaylistPreviewState;
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
  const {
    focusModeActive,
    routeState,
    settings,
    playlistState,
    playlistPreviewState,
  } = useFocusUiState();
  const sections = getFocusOverlaySections(
    settings,
    playlistState.items,
    playlistPreviewState.playlists
  );
  const usingImportedPlaylists = settings.importedPlaylists.length > 0;
  const hasPlaylistSections = sections.length > 1;

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
          font-size: 26px;
          font-weight: 600;
          letter-spacing: 0;
          line-height: 1.15;
          margin: 0;
        }

        .youtube-focus-overlay__body {
          color: rgba(241, 241, 241, 0.72);
          font-size: 14px;
          line-height: 1.45;
          margin: 6px 0 0;
          max-width: 52ch;
        }

        .youtube-focus-overlay__sections {
          display: grid;
          gap: 28px;
          margin-top: 4px;
        }

        .youtube-focus-overlay__section-head {
          align-items: center;
          display: flex;
          gap: 10px;
          margin-bottom: 14px;
          min-width: 0;
        }

        .youtube-focus-overlay__section-icon {
          color: rgba(241, 241, 241, 0.9);
          flex: 0 0 auto;
          font-size: 18px;
          line-height: 1;
        }

        .youtube-focus-overlay__section-title {
          font-size: 20px;
          font-weight: 700;
          line-height: 1.2;
          margin: 0;
        }

        .youtube-focus-overlay__grid {
          display: grid;
          gap: 18px;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }

        .youtube-focus-overlay__card {
          color: inherit;
          display: block;
          min-width: 0;
          text-decoration: none;
        }

        .youtube-focus-overlay__card:focus-visible {
          outline: 2px solid #ffffff;
          outline-offset: 3px;
        }

        .youtube-focus-overlay__card-thumb {
          align-items: center;
          aspect-ratio: 16 / 9;
          background: #202124;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          display: grid;
          justify-items: center;
          overflow: hidden;
          position: relative;
          width: 100%;
        }

        .youtube-focus-overlay__card:hover .youtube-focus-overlay__card-thumb {
          border-color: rgba(255, 255, 255, 0.18);
        }

        .youtube-focus-overlay__card-thumb[data-source="imported"] {
          background: #111111;
        }

        .youtube-focus-overlay__card-thumb[data-source="watch-later"] {
          background: linear-gradient(180deg, #1a1d23 0%, #15171c 100%);
        }

        .youtube-focus-overlay__card-thumb[data-source="manual"] {
          background: linear-gradient(180deg, #1b1f27 0%, #161922 100%);
        }

        .youtube-focus-overlay__card-image {
          display: block;
          height: 100%;
          object-fit: cover;
          width: 100%;
        }

        .youtube-focus-overlay__card-placeholder {
          align-items: center;
          color: #f1f1f1;
          display: grid;
          gap: 10px;
          justify-items: center;
          padding: 24px;
          text-align: center;
        }

        .youtube-focus-overlay__card-badge {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          color: rgba(241, 241, 241, 0.86);
          display: inline-flex;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0;
          padding: 6px 10px;
          text-transform: uppercase;
        }

        .youtube-focus-overlay__card-icon {
          color: #a9c3ff;
          font-size: 28px;
          font-weight: 700;
          line-height: 1;
        }

        .youtube-focus-overlay__card-meta {
          display: grid;
          gap: 4px;
          margin-top: 10px;
          min-width: 0;
        }

        .youtube-focus-overlay__card-title {
          display: block;
          font-size: 16px;
          font-weight: 600;
          line-height: 1.3;
          margin: 0;
        }

        .youtube-focus-overlay__card-subtitle {
          color: rgba(241, 241, 241, 0.56);
          display: block;
          font-size: 13px;
        }

        .youtube-focus-overlay__button {
          align-self: start;
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
            padding: 18px;
          }

          .youtube-focus-overlay__title {
            font-size: 22px;
          }

          .youtube-focus-overlay__sections {
            gap: 22px;
          }

          .youtube-focus-overlay__section-title {
            font-size: 18px;
          }

          .youtube-focus-overlay__grid {
            gap: 14px;
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
      <section
        className="youtube-focus-overlay"
        data-testid="youtube-focus-overlay"
      >
        <div className="youtube-focus-overlay__panel">
          <span className="youtube-focus-overlay__eyebrow">Focus Home</span>
          <h2 className="youtube-focus-overlay__title">Your queue</h2>
          <p className="youtube-focus-overlay__body">
            {usingImportedPlaylists
              ? "Showing Watch Later and your selected playlists."
              : hasPlaylistSections
                ? "Showing Watch Later and your saved manual playlist shortcuts."
                : "Showing Watch Later. Add playlists in Settings to build your queue."}
          </p>
          <div className="youtube-focus-overlay__sections">
            {sections.map((section) => (
              <section key={`${section.kind}:${section.url}`}>
                <div className="youtube-focus-overlay__section-head">
                  <span className="youtube-focus-overlay__section-icon" aria-hidden="true">
                    {section.kind === "watch-later" ? "WL" : "PL"}
                  </span>
                  <h3 className="youtube-focus-overlay__section-title">
                    {section.title}
                  </h3>
                </div>
                <div className="youtube-focus-overlay__grid">
                  {section.items.map((item) => (
                    <a
                      key={`${section.title}:${item.url}`}
                      className="youtube-focus-overlay__card"
                      data-kind={section.kind}
                      href={item.url}
                    >
                      <span
                        className="youtube-focus-overlay__card-thumb"
                        data-source={section.source}
                      >
                        {item.thumbnailUrl ? (
                          <img
                            alt=""
                            className="youtube-focus-overlay__card-image"
                            loading="lazy"
                            src={item.thumbnailUrl}
                          />
                        ) : (
                          <span className="youtube-focus-overlay__card-placeholder">
                            <span className="youtube-focus-overlay__card-badge">
                              {section.source === "watch-later"
                                ? "Watch Later"
                                : "Playlist"}
                            </span>
                            <span className="youtube-focus-overlay__card-icon">
                              {section.source === "watch-later" ? "WL" : "PL"}
                            </span>
                          </span>
                        )}
                      </span>
                      <span className="youtube-focus-overlay__card-meta">
                        <span className="youtube-focus-overlay__card-title">
                          {item.title}
                        </span>
                        <span className="youtube-focus-overlay__card-subtitle">
                          {item.subtitle}
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <button
            className="youtube-focus-overlay__button"
            type="button"
            onClick={handleOpenSettings}
          >
            Open Settings
          </button>
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
  const [playlistState, setPlaylistState] = useState<YouTubePlaylistState>(
    DEFAULT_YOUTUBE_PLAYLIST_STATE
  );
  const [playlistPreviewState, setPlaylistPreviewState] =
    useState<YouTubePlaylistPreviewState>(
      DEFAULT_YOUTUBE_PLAYLIST_PREVIEW_STATE
    );
  const [routeState, setRouteState] = useState<YouTubeRouteState>(() =>
    getYouTubeRouteState(window.location.href)
  );

  useEffect(() => {
    return subscribeToFocusSettings(setSettings);
  }, []);

  useEffect(() => {
    return subscribeToYouTubePlaylistState(setPlaylistState);
  }, []);

  useEffect(() => {
    return subscribeToYouTubePlaylistPreviewState(setPlaylistPreviewState);
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
    playlistState,
    playlistPreviewState,
  };
}
