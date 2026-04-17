import { ensureFocusSettings } from "./settings/storage";

chrome.runtime.onInstalled.addListener(() => {
  void ensureFocusSettings();
});
