import { useEffect, useState } from "react";
import { DEFAULT_FOCUS_SETTINGS } from "@/settings/defaults";
import { subscribeToFocusSettings } from "@/settings/storage";
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

  useEffect(() => {
    const host = document.getElementById(EXTENSION_HOST_ID);
    if (!host) {
      return;
    }

    host.dataset.youtubeFocusRoute = routeState.kind;
    host.dataset.youtubeFocusIsHome = String(routeState.isHome);
    host.dataset.youtubeFocusActive = String(focusModeActive);
  }, [focusModeActive, routeState]);

  if (!routeState.isHome || !focusModeActive) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-56 rounded-md border border-white/15 bg-gray-950 px-3 py-2 text-xs font-medium text-white shadow-lg">
      Focus mode ready
    </div>
  );
}
