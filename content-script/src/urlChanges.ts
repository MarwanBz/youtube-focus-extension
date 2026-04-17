type UrlChangeHandler = (url: string) => void;

const YOUTUBE_NAVIGATION_EVENT = "yt-navigate-finish";
const POLL_INTERVAL_MS = 500;

export function subscribeToUrlChanges(handler: UrlChangeHandler) {
  let lastUrl = window.location.href;

  const notifyIfChanged = () => {
    const nextUrl = window.location.href;
    if (nextUrl === lastUrl) {
      return;
    }

    lastUrl = nextUrl;
    handler(nextUrl);
  };

  handler(lastUrl);

  window.addEventListener("popstate", notifyIfChanged);
  window.addEventListener(YOUTUBE_NAVIGATION_EVENT, notifyIfChanged);

  const intervalId = window.setInterval(
    notifyIfChanged,
    POLL_INTERVAL_MS
  );

  return () => {
    window.removeEventListener("popstate", notifyIfChanged);
    window.removeEventListener(YOUTUBE_NAVIGATION_EVENT, notifyIfChanged);
    window.clearInterval(intervalId);
  };
}
