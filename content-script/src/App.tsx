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
          align-items: flex-start;
          background: #272727;
          border-radius: 12px;
          box-sizing: border-box;
          color: #f1f1f1;
          display: flex;
          font-family: Roboto, Arial, sans-serif;
          gap: 16px;
          margin: 24px 24px 16px;
          padding: 16px 20px;
          width: calc(100% - 48px);
        }

        .youtube-focus-banner[data-variant="off"] {
          background: rgba(204, 0, 0, 0.15);
        }

        .youtube-focus-banner__icon {
          color: #f1f1f1;
          display: block;
          flex: 0 0 auto;
          height: 24px;
          width: 24px;
        }

        .youtube-focus-banner[data-variant="off"] .youtube-focus-banner__icon {
          color: #ff4e45;
        }

        .youtube-focus-banner[data-variant="on"] .youtube-focus-banner__icon {
          color: #3ea6ff;
        }

        .youtube-focus-banner__text-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-top: 2px;
        }

        .youtube-focus-banner__title {
          font-size: 16px;
          font-weight: 500;
          line-height: 1.25;
          margin: 0;
        }

        .youtube-focus-banner__body {
          color: #aaaaaa;
          font-size: 14px;
          font-weight: 400;
          line-height: 1.4;
          margin: 0;
        }

        @media (max-width: 900px) {
          .youtube-focus-banner {
            margin: 16px 12px;
            padding: 12px 16px;
            width: calc(100% - 24px);
          }
          
          .youtube-focus-banner__title {
            font-size: 15px;
          }
          
          .youtube-focus-banner__body {
            font-size: 13px;
          }
        }
      `}</style>
      <section
        className="youtube-focus-banner"
        data-variant={banner.variant}
        role="status"
      >
        <BannerIcon variant={banner.variant} />
        <div className="youtube-focus-banner__text-wrap">
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
          box-sizing: border-box;
          display: block;
          padding: 24px 0;
          width: 100%;
        }

        .youtube-focus-overlay__header {
          align-items: center;
          display: flex;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .youtube-focus-overlay__header-text {
          min-width: 0;
        }

        .youtube-focus-overlay__title {
          font-size: 20px;
          font-weight: 700;
          line-height: 1.4;
          margin: 0;
        }

        .youtube-focus-overlay__body {
          color: #aaaaaa;
          font-size: 14px;
          line-height: 1.45;
          margin: 4px 0 0;
        }

        .youtube-focus-overlay__button {
          align-items: center;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 18px;
          color: #f1f1f1;
          cursor: pointer;
          display: inline-flex;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          height: 36px;
          padding: 0 16px;
          transition: background 120ms ease;
        }

        .youtube-focus-overlay__button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .youtube-focus-overlay__button:focus-visible {
          outline: 2px solid #ffffff;
          outline-offset: 2px;
        }

        .youtube-focus-overlay__sections {
          display: grid;
          gap: 32px;
        }

        .youtube-focus-overlay__section-head {
          align-items: center;
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          min-width: 0;
        }

        .youtube-focus-overlay__section-icon {
          color: #f1f1f1;
          flex: 0 0 auto;
          height: 24px;
          width: 24px;
        }

        .youtube-focus-overlay__section-title {
          font-size: 16px;
          font-weight: 700;
          line-height: 1.2;
          margin: 0;
        }

        .youtube-focus-overlay__grid {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        }

        .youtube-focus-overlay__card {
          color: inherit;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
          text-decoration: none;
        }

        .youtube-focus-overlay__card:hover .youtube-focus-overlay__card-title,
        .youtube-focus-overlay__card:focus-visible .youtube-focus-overlay__card-title {
          color: #ffffff;
        }

        .youtube-focus-overlay__card:focus-visible {
          outline: none;
        }

        .youtube-focus-overlay__card:focus-visible .youtube-focus-overlay__card-thumb {
          outline: 2px solid #ffffff;
          outline-offset: 2px;
        }

        .youtube-focus-overlay__card-thumb {
          align-items: center;
          aspect-ratio: 16 / 9;
          background: #272727;
          border-radius: 12px;
          display: flex;
          justify-content: center;
          overflow: hidden;
          position: relative;
          transition: border-radius 200ms ease-in-out;
          width: 100%;
        }

        .youtube-focus-overlay__card:hover .youtube-focus-overlay__card-thumb {
          border-radius: 0;
        }

        .youtube-focus-overlay__card-image {
          display: block;
          height: 100%;
          object-fit: cover;
          width: 100%;
        }

        .youtube-focus-overlay__card-placeholder {
          align-items: center;
          color: #aaaaaa;
          display: flex;
          height: 100%;
          justify-content: center;
          width: 100%;
        }

        .youtube-focus-overlay__card-placeholder svg {
          height: 48px;
          width: 48px;
        }

        .youtube-focus-overlay__card-meta {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .youtube-focus-overlay__card-title {
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          color: #f1f1f1;
          display: -webkit-box;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.4;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .youtube-focus-overlay__card-subtitle {
          color: #aaaaaa;
          display: block;
          font-size: 12px;
          line-height: 1.4;
          margin-top: 4px;
        }

        @media (max-width: 900px) {
          .youtube-focus-overlay {
            margin: 0 12px 16px;
            width: calc(100% - 24px);
          }

          .youtube-focus-overlay__grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
      <section
        className="youtube-focus-overlay"
        data-testid="youtube-focus-overlay"
      >
        <div className="youtube-focus-overlay__panel">
          <div className="youtube-focus-overlay__header">
            <div className="youtube-focus-overlay__header-text">
              <h2 className="youtube-focus-overlay__title">Your Queue</h2>
              <p className="youtube-focus-overlay__body">
                {usingImportedPlaylists
                  ? "Showing Watch Later and your selected playlists."
                  : hasPlaylistSections
                    ? "Showing Watch Later and your saved manual playlist shortcuts."
                    : "Showing Watch Later. Add playlists in Settings to build your queue."}
              </p>
            </div>
            <button
              className="youtube-focus-overlay__button"
              type="button"
              onClick={handleOpenSettings}
            >
              Settings
            </button>
          </div>
          <div className="youtube-focus-overlay__sections">
            {sections.map((section) => (
              <section key={`${section.kind}:${section.url}`}>
                <div className="youtube-focus-overlay__section-head">
                  {section.kind === "watch-later" ? (
                    <WatchLaterIcon className="youtube-focus-overlay__section-icon" />
                  ) : (
                    <PlaylistIcon className="youtube-focus-overlay__section-icon" />
                  )}
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
                      <span className="youtube-focus-overlay__card-thumb">
                        {item.thumbnailUrl ? (
                          <img
                            alt=""
                            className="youtube-focus-overlay__card-image"
                            loading="lazy"
                            src={item.thumbnailUrl}
                          />
                        ) : (
                          <span className="youtube-focus-overlay__card-placeholder">
                            {section.source === "watch-later" ? (
                              <WatchLaterIcon />
                            ) : (
                              <PlaylistIcon />
                            )}
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
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2ZM12 4.4L9.84 8.77L5 9.46L8.5 12.86L7.68 17.65L12 15.38L16.32 17.65L15.5 12.86L19 9.46L14.16 8.77L12 4.4Z"/>
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="youtube-focus-banner__icon"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M11 15h2v2h-2v-2zm0-8h2v6h-2V7zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
    </svg>
  );
}

function WatchLaterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14.97,16.95L10,13.87V7H11.5V12.92L15.76,15.59L14.97,16.95ZM12,3C6.48,3 2,7.48 2,13C2,18.52 6.48,23 12,23C17.52,23 22,18.52 22,13C22,7.48 17.52,3 12,3ZM12,22C7.03,22 3,17.97 3,13C3,8.03 7.03,4 12,4C16.97,4 21,8.03 21,13C21,17.97 16.97,22 12,22Z"></path>
    </svg>
  );
}

function PlaylistIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 7H2v1h20V7zm0 4H2v-1h20v1zm0 4H2v-1h20v1z" style={{display: 'none'}} />
      <path d="M21 6H3V5h18V6zm0 4H3V9h18v1zm0 4H3v-1h18v1zM14 18H3v-1h11v1zm2-2v5l5-2.5L16 16z"/>
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
