import { useEffect, useState } from "react";
import { DEFAULT_FOCUS_SETTINGS } from "./settings/defaults";
import { subscribeToFocusSettings } from "./settings/storage";
import type { FocusSettings } from "./settings/schema";

export default function App() {
  const [settings, setSettings] = useState<FocusSettings>(
    DEFAULT_FOCUS_SETTINGS
  );

  useEffect(() => {
    return subscribeToFocusSettings(setSettings);
  }, []);

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
      <div className="mt-3 rounded-md border border-white/15 px-3 py-2">
        <p className="text-xs text-gray-400">Focus mode default</p>
        <p className="mt-1 text-sm font-semibold">
          {settings.focusModeEnabled ? "On" : "Off"}
        </p>
      </div>
    </div>
  );
}
