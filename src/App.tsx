import { useEffect, useState } from "react";
import {
  connectYouTubeFromUi,
  getAuthChipText,
  getAuthPrimaryAction,
  getCompactAuthTone,
} from "./auth/client";
import {
  DEFAULT_YOUTUBE_AUTH_STATE,
  type YouTubeAuthState,
} from "./auth/schema";
import { subscribeToYouTubeAuthState } from "./auth/storage";
import { DEFAULT_FOCUS_SETTINGS } from "./settings/defaults";
import { patchFocusSettings, subscribeToFocusSettings } from "./settings/storage";
import type { FocusSettings } from "./settings/schema";

export default function App() {
  const [settings, setSettings] = useState<FocusSettings>(
    DEFAULT_FOCUS_SETTINGS
  );
  const [youtubeAuth, setYouTubeAuth] = useState<YouTubeAuthState>(
    DEFAULT_YOUTUBE_AUTH_STATE
  );
  const [saveError, setSaveError] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToFocusSettings(setSettings);
  }, []);
  useEffect(() => {
    return subscribeToYouTubeAuthState(setYouTubeAuth);
  }, []);

  const handleToggleFocus = () => {
    setSaveError(false);
    patchFocusSettings({ focusModeEnabled: !settings.focusModeEnabled })
      .catch(() => setSaveError(true));
  };

  const handleOpenOptions = () => {
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
  const handleConnectYouTube = () => {
    if (authLoading) {
      return;
    }
    setAuthError(null);
    setAuthLoading(true);
    void connectYouTubeFromUi().then((response) => {
      setAuthLoading(false);
      if (!response.ok) {
        setAuthError(response.message);
        return;
      }
      if (!response.result.ok && response.result.status === "failed") {
        setAuthError(response.result.message);
      }
    });
  };

  const enabled = settings.focusModeEnabled;

  return (
    <div className="w-[260px] bg-gray-950 p-3 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold">YouTube Focus</h1>
        <button
          className="text-xs text-gray-400 hover:text-white"
          type="button"
          onClick={handleOpenOptions}
        >
          Settings
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">Focus mode</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle focus mode"
          onClick={handleToggleFocus}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-150 ${
            saveError ? "ring-2 ring-red-500" : ""
          } ${enabled ? "bg-[#2d7dff]" : "bg-gray-600"}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform duration-150 ${
              enabled ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      <div className="mt-3 rounded border border-white/10 p-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-400">YouTube auth</span>
          <span className={`text-xs ${getCompactAuthTone(youtubeAuth)}`}>
            {getAuthChipText(youtubeAuth)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleConnectYouTube}
          disabled={authLoading}
          className="mt-2 w-full rounded bg-blue-600 px-2 py-1.5 text-xs font-medium hover:bg-blue-500 disabled:cursor-default disabled:opacity-60"
        >
          {authLoading ? "Connecting..." : getAuthPrimaryAction(youtubeAuth)}
        </button>
        <button
          type="button"
          onClick={handleOpenOptions}
          className="mt-2 w-full rounded border border-white/10 px-2 py-1.5 text-xs text-gray-300 hover:text-white"
        >
          Open options for fallback setup
        </button>
      </div>
      {saveError ? (
        <p className="mt-2 text-xs text-red-400">Failed to save. Try again.</p>
      ) : null}
      {authError ? (
        <p className="mt-2 text-xs text-red-400">{authError}</p>
      ) : null}
    </div>
  );
}
