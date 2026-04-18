import type { FocusSettings } from "@/settings/schema";
import type { YouTubeRouteState } from "./youtubeHome";

export const WATCH_LATER_URL = "https://www.youtube.com/playlist?list=WL";

export type FocusOverlaySource = {
  kind: "watch-later" | "playlist";
  title: string;
  url: string;
};

export function shouldRenderHomeFocusOverlay(
  routeState: YouTubeRouteState,
  focusModeActive: boolean
) {
  return routeState.isHome && focusModeActive;
}

export function getFocusOverlaySources(
  settings: FocusSettings
): FocusOverlaySource[] {
  return [
    {
      kind: "watch-later",
      title: "Watch Later",
      url: WATCH_LATER_URL,
    },
    ...settings.manualPlaylists.map((playlist) => ({
      kind: "playlist" as const,
      title: playlist.title,
      url: playlist.url,
    })),
  ];
}
