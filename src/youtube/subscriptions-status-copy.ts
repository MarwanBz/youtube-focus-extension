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
      text: "No subscribed channels found.",
    };
  }

  if (status === "unauthorized") {
    return {
      tone: "error",
      text: "Reconnect YouTube.",
    };
  }

  if (status === "unavailable") {
    return {
      tone: "warning",
      text: "Subscriptions unavailable. Retry soon.",
    };
  }

  if (status === "failed") {
    return {
      tone: "error",
      text: lastError || "Unable to load subscriptions.",
    };
  }

  return null;
}
