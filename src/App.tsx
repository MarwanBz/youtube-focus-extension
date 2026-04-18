import { useEffect, useState } from "react";
import { DEFAULT_FOCUS_SETTINGS } from "./settings/defaults";
import { patchFocusSettings, subscribeToFocusSettings } from "./settings/storage";
import type { FocusSettings } from "./settings/schema";

export default function App() {
  const [settings, setSettings] = useState<FocusSettings>(
    DEFAULT_FOCUS_SETTINGS
  );
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    return subscribeToFocusSettings(setSettings);
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
      {saveError ? (
        <p className="mt-2 text-xs text-red-400">Failed to save. Try again.</p>
      ) : null}
    </div>
  );
}
