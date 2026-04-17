export type YouTubeRouteKind =
  | "home"
  | "watch"
  | "shorts"
  | "search"
  | "playlist"
  | "subscriptions"
  | "channel"
  | "other"
  | "external";

export type YouTubeRouteState = {
  kind: YouTubeRouteKind;
  isHome: boolean;
  href: string;
};

export function getYouTubeRouteState(input: string | URL): YouTubeRouteState {
  const url = toUrl(input);
  if (!url || !isYouTubeHost(url)) {
    return {
      kind: "external",
      isHome: false,
      href: String(input),
    };
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const [first, second] = segments;
  const kind = getRouteKind(first, second);

  return {
    kind,
    isHome: kind === "home",
    href: url.href,
  };
}

export function isYouTubeHomeUrl(input: string | URL) {
  return getYouTubeRouteState(input).isHome;
}

function getRouteKind(
  firstSegment: string | undefined,
  secondSegment: string | undefined
): YouTubeRouteKind {
  if (!firstSegment) {
    return "home";
  }

  if (firstSegment === "watch") {
    return "watch";
  }

  if (firstSegment === "shorts") {
    return "shorts";
  }

  if (firstSegment === "results") {
    return "search";
  }

  if (firstSegment === "playlist") {
    return "playlist";
  }

  if (firstSegment === "feed" && secondSegment === "subscriptions") {
    return "subscriptions";
  }

  if (
    firstSegment.startsWith("@") ||
    firstSegment === "channel" ||
    firstSegment === "c" ||
    firstSegment === "user"
  ) {
    return "channel";
  }

  return "other";
}

function toUrl(input: string | URL) {
  try {
    return input instanceof URL ? input : new URL(input);
  } catch {
    return null;
  }
}

function isYouTubeHost(url: URL) {
  return url.protocol === "https:" && url.hostname === "www.youtube.com";
}
