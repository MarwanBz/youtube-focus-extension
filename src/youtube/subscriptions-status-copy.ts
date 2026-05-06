import type { YouTubeSubscriptionFetchStatus } from "./subscriptions-schema";

export type SubscriptionStatusCopy = {
  tone: "neutral" | "warning" | "error";
  text: string;
};

export function getSubscriptionStatusCopy(
  status: YouTubeSubscriptionFetchStatus,
  lastError: string | null
): SubscriptionStatusCopy | null {
  if (status === "loading") {
    return {
      tone: "neutral",
      text: "Loading subscriptions...",
    };
  }

  if (status === "empty") {
    return {
      tone: "neutral",
      text: "No subscribed channels found yet.",
    };
  }

  if (status === "unauthorized") {
    return {
      tone: "error",
      text: "Authorization expired or was revoked. Reconnect YouTube and retry.",
    };
  }

  if (status === "unavailable") {
    return {
      tone: "warning",
      text: "YouTube subscriptions are temporarily unavailable. Retry soon.",
    };
  }

  if (status === "failed") {
    return {
      tone: "error",
      text: lastError || "Unable to load subscriptions right now.",
    };
  }

  return null;
}
