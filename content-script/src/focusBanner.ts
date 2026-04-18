export type FocusBannerVariant = "off" | "on";

export type FocusBannerContent = {
  body: string;
  title: string;
  variant: FocusBannerVariant;
};

export function getFocusBannerContent(
  focusModeEnabled: boolean
): FocusBannerContent {
  if (focusModeEnabled) {
    return {
      variant: "on",
      title: "You're in Control Now",
      body: "Don't be a slave to the algorithm's recommendations. Focus Mode puts you back in the driver's seat by showing only the content YOU chose to watch - your Watch Later queue and curated playlists. No distractions, no rabbit holes, just intentional viewing.",
    };
  }

  return {
    variant: "off",
    title: "The Algorithm is in Control",
    body: "These recommendations are designed to maximize your watch time, not your productivity. Each video is engineered to trigger curiosity and keep you scrolling. Toggle Focus Mode above to take back control.",
  };
}
