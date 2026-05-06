import { useEffect, useState, type WheelEvent } from "react";
import { DEFAULT_FOCUS_SETTINGS } from "@/settings/defaults";
import {
  patchFocusSettings,
  subscribeToFocusSettings,
} from "@/settings/storage";
import { useTemporaryDisableNow } from "@/settings/useTemporaryDisableNow";
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
  DEFAULT_YOUTUBE_CHANNEL_PREVIEW_STATE,
  type YouTubeChannelPreviewState,
} from "@/youtube/channel-preview-schema";
import { subscribeToYouTubeChannelPreviewState } from "@/youtube/channel-preview-storage";
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
  extractWatchSuggestionMetadata,
  syncWatchSoftFocusVisibility,
  shouldRenderWatchSoftFocus,
  type WatchSuggestionMetadata,
} from "./watchSoftFocus";
import {
  getYouTubeRouteState,
  type YouTubeRouteState,
} from "./youtubeHome";
import {
  getFocusOverlayHeaderContent,
  getFocusOverlayWheelRoute,
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
  channelPreviewState: YouTubeChannelPreviewState;
};

export function WatchPageFocusFoundation() {
  const { focusModeActive, routeState } = useFocusUiState();
  const [suggestions, setSuggestions] = useState<WatchSuggestionMetadata[]>([]);
  const [suggestionsRevealed, setSuggestionsRevealed] = useState(false);
  const [commentsRevealed, setCommentsRevealed] = useState(false);

  useEffect(() => {
    setSuggestionsRevealed(false);
    setCommentsRevealed(false);
  }, [routeState.href]);

  useEffect(() => {
    if (!shouldRenderWatchSoftFocus(routeState, focusModeActive)) {
      setSuggestions([]);
      syncWatchSoftFocusVisibility(document, {
        dimSuggestions: false,
        dimComments: false,
      });
      return;
    }

    const sync = () => {
      setSuggestions(extractWatchSuggestionMetadata(document));
      syncWatchSoftFocusVisibility(document, {
        dimSuggestions: !suggestionsRevealed,
        dimComments: !commentsRevealed,
      });
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      syncWatchSoftFocusVisibility(document, {
        dimSuggestions: false,
        dimComments: false,
      });
    };
  }, [commentsRevealed, focusModeActive, routeState, suggestionsRevealed]);

  if (!shouldRenderWatchSoftFocus(routeState, focusModeActive)) {
    return null;
  }

  const revealCount = Number(!suggestionsRevealed) + Number(!commentsRevealed);

  return (
    <>
      <style>{`
        .youtube-focus-watch {
          box-sizing: border-box;
          color: #f1f1f1;
          font-family: Roboto, Arial, sans-serif;
          margin-bottom: 16px;
          width: 100%;
        }

        .youtube-focus-watch__panel {
          backdrop-filter: blur(16px);
          background: linear-gradient(180deg, rgba(28, 28, 28, 0.96), rgba(22, 22, 22, 0.92));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          box-sizing: border-box;
          overflow: hidden;
          padding: 16px 18px;
          position: relative;
        }

        .youtube-focus-watch__panel::after {
          background: linear-gradient(90deg, rgba(255, 78, 69, 0.18), rgba(62, 166, 255, 0));
          content: "";
          inset: 0;
          pointer-events: none;
          position: absolute;
        }

        .youtube-focus-watch__eyebrow {
          color: #aaaaaa;
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          margin-bottom: 8px;
          position: relative;
          text-transform: uppercase;
          z-index: 1;
        }

        .youtube-focus-watch__title {
          font-size: 18px;
          font-weight: 700;
          line-height: 1.35;
          margin: 0;
          position: relative;
          z-index: 1;
        }

        .youtube-focus-watch__body {
          color: #c7c7c7;
          font-size: 13px;
          line-height: 1.55;
          margin: 8px 0 0;
          position: relative;
          z-index: 1;
        }

        .youtube-focus-watch__foot {
          color: #8f8f8f;
          display: block;
          font-size: 12px;
          margin-top: 10px;
          position: relative;
          z-index: 1;
        }

        .youtube-focus-watch__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
          position: relative;
          z-index: 1;
        }

        .youtube-focus-watch__button {
          align-items: center;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          color: #f1f1f1;
          cursor: pointer;
          display: inline-flex;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          height: 32px;
          padding: 0 12px;
          transition: background 120ms ease, border-color 120ms ease, opacity 120ms ease;
        }

        .youtube-focus-watch__button:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.14);
        }

        .youtube-focus-watch__button:focus-visible {
          outline: 2px solid #ffffff;
          outline-offset: 2px;
        }

        .youtube-focus-watch__button:disabled {
          cursor: default;
          opacity: 0.48;
        }
      `}</style>
      <section className="youtube-focus-watch" data-testid="youtube-focus-watch">
        <div className="youtube-focus-watch__panel">
          <span className="youtube-focus-watch__eyebrow">Watch Focus</span>
          <h2 className="youtube-focus-watch__title">
            Suggestions are softened so you can stay with this video.
          </h2>
          <p className="youtube-focus-watch__body">
            Related videos and comments are dimmed and inert until you ask
            for them. Reveal only the distraction surface you actually
            need.
          </p>
          <span className="youtube-focus-watch__foot">
            Focus context ready from {suggestions.length} suggested videos for
            future reveal controls and optional AI guidance.
          </span>
          <div className="youtube-focus-watch__actions">
            <button
              className="youtube-focus-watch__button"
              type="button"
              disabled={suggestionsRevealed}
              onClick={() => setSuggestionsRevealed(true)}
            >
              {suggestionsRevealed ? "Suggestions visible" : "Show suggestions"}
            </button>
            <button
              className="youtube-focus-watch__button"
              type="button"
              disabled={commentsRevealed}
              onClick={() => setCommentsRevealed(true)}
            >
              {commentsRevealed ? "Comments visible" : "Show comments"}
            </button>
            <button
              className="youtube-focus-watch__button"
              type="button"
              disabled={revealCount === 0}
              onClick={() => {
                setSuggestionsRevealed(true);
                setCommentsRevealed(true);
              }}
            >
              Reveal all
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

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
      disabledUntil: null,
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

  useHomeFeedVisibilitySync(routeState.isHome && focusModeActive);

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
    channelPreviewState,
  } = useFocusUiState();
  const sections = getFocusOverlaySections(
    settings,
    playlistState.items,
    playlistPreviewState.playlists,
    channelPreviewState.channels
  );
  const headerContent = getFocusOverlayHeaderContent(settings);

  useHomeFeedVisibilitySync(routeState.isHome && focusModeActive);

  if (!shouldRenderHomeFocusOverlay(routeState, focusModeActive)) {
    return null;
  }

  const handleOpenSettings = () => {
    if (typeof chrome === "undefined") {
      return;
    }

    try {
      chrome.runtime.sendMessage({ action: "open_options" });
    } catch {
      // Fallback
      if (chrome.runtime?.getURL) {
        window.open(chrome.runtime.getURL("options.html"));
      }
    }
  };

  const handleSectionWheel = (event: WheelEvent<HTMLDivElement>) => {
    const route = getFocusOverlayWheelRoute({
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      shiftKey: event.shiftKey,
    });

    if (route.kind === "ignore") {
      return;
    }

    if (route.kind === "section") {
      if (
        event.currentTarget.scrollWidth <= event.currentTarget.clientWidth + 1
      ) {
        return;
      }

      event.preventDefault();
      event.currentTarget.scrollBy({
        left: route.delta,
        behavior: "auto",
      });
      return;
    }

    const pageScroller = getHomePageScrollContainer();
    if (!pageScroller) {
      return;
    }

    event.preventDefault();

    if (pageScroller === document.documentElement) {
      window.scrollBy({
        top: route.delta,
        behavior: "auto",
      });
      return;
    }

    pageScroller.scrollBy({
      top: route.delta,
      behavior: "auto",
    });
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

        .youtube-focus-overlay__section-heading {
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

        .youtube-focus-overlay__section-link {
          color: inherit;
          text-decoration: none;
        }

        .youtube-focus-overlay__section-link:hover,
        .youtube-focus-overlay__section-link:focus-visible {
          text-decoration: underline;
        }

        .youtube-focus-overlay__grid {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding-bottom: 12px;
          scroll-snap-type: x mandatory;
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }

        .youtube-focus-overlay__grid::-webkit-scrollbar {
          height: 8px;
        }

        .youtube-focus-overlay__grid::-webkit-scrollbar-track {
          background: transparent;
        }

        .youtube-focus-overlay__grid::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }

        .youtube-focus-overlay__grid::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }

        .youtube-focus-overlay__card {
          color: inherit;
          display: flex;
          flex: 0 0 210px;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
          scroll-snap-align: start;
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
            padding-bottom: 8px;
          }

          .youtube-focus-overlay__card {
            flex: 0 0 180px;
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
                {headerContent.body}
              </p>
            </div>
            <button
              className="youtube-focus-overlay__button"
              type="button"
              onClick={handleOpenSettings}
            >
              {headerContent.buttonLabel}
            </button>
          </div>
          <div className="youtube-focus-overlay__sections">
            {sections.map((section) => (
              <section key={`${section.kind}:${section.url}`}>
                <div className="youtube-focus-overlay__section-head">
                  {section.kind === "watch-later" ? (
                    <WatchLaterIcon className="youtube-focus-overlay__section-icon" />
                  ) : section.kind === "channel" ? (
                    <ChannelIcon className="youtube-focus-overlay__section-icon" />
                  ) : (
                    <PlaylistIcon className="youtube-focus-overlay__section-icon" />
                  )}
                  <div className="youtube-focus-overlay__section-heading">
                    <h3 className="youtube-focus-overlay__section-title">
                      <a
                        className="youtube-focus-overlay__section-link"
                        href={section.url}
                      >
                        {section.title}
                      </a>
                    </h3>
                  </div>
                </div>
                <div
                  className="youtube-focus-overlay__grid"
                  onWheel={handleSectionWheel}
                >
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
                              ) : section.kind === "channel" ? (
                                <ChannelIcon />
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

function useHomeFeedVisibilitySync(shouldHideHomeFeed: boolean) {
  useEffect(() => {
    const sync = () => {
      syncHomeFeedVisibility(document, shouldHideHomeFeed);
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
  }, [shouldHideHomeFeed]);
}

function getHomePageScrollContainer() {
  const candidates = [
    document.scrollingElement,
    document.querySelector("ytd-app"),
    document.documentElement,
    document.body,
  ].filter((value): value is HTMLElement => value instanceof HTMLElement);

  return (
    candidates.find(
      (candidate) => candidate.scrollHeight > candidate.clientHeight + 1
    ) ?? document.documentElement
  );
}

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

function ChannelIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
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
  const [channelPreviewState, setChannelPreviewState] =
    useState<YouTubeChannelPreviewState>(DEFAULT_YOUTUBE_CHANNEL_PREVIEW_STATE);
  const [routeState, setRouteState] = useState<YouTubeRouteState>(() =>
    getYouTubeRouteState(window.location.href)
  );
  const now = useTemporaryDisableNow(settings.disabledUntil);

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
    return subscribeToYouTubeChannelPreviewState(setChannelPreviewState);
  }, []);

  useEffect(() => {
    return subscribeToUrlChanges((url) => {
      setRouteState(getYouTubeRouteState(url));
    });
  }, []);

  return {
    focusModeActive: isFocusModeActive(settings, now),
    focusModeEnabled: settings.focusModeEnabled,
    routeState,
    settings,
    playlistState,
    playlistPreviewState,
    channelPreviewState,
  };
}
