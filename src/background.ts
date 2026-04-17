const BADGE_COLOR = "#111827";
let badgeCount = 0;
let hasBadgeCount = false;

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  syncBadgeCount(() => updateBadge());
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "INCREMENT_BADGE") {
    syncBadgeCount(() => {
      badgeCount += 1;
      updateBadge();
      sendResponse({ count: badgeCount });
    });
    return true;
  }

  if (message?.type === "RESET_BADGE") {
    syncBadgeCount(() => {
      badgeCount = 0;
      updateBadge();
      sendResponse({ count: badgeCount });
    });
    return true;
  }
});

function syncBadgeCount(done: () => void) {
  if (hasBadgeCount) {
    done();
    return;
  }

  chrome.action.getBadgeText({}, (text) => {
    const parsed = Number.parseInt(text, 10);
    badgeCount = Number.isFinite(parsed) ? parsed : 0;
    hasBadgeCount = true;
    done();
  });
}

function updateBadge() {
  chrome.action.setBadgeText({
    text: badgeCount > 0 ? String(badgeCount) : "",
  });
}
