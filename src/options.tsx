import {
  StrictMode,
  useEffect,
  useState,
  type ChangeEvent,
} from "react";
import { createRoot } from "react-dom/client";
import "@lib/styles/globals.css";
import { DEFAULT_FOCUS_SETTINGS } from "./settings/defaults";
import {
  patchFocusSettings,
  subscribeToFocusSettings,
} from "./settings/storage";
import type { FocusSettings } from "./settings/schema";

const manifest =
  typeof chrome !== "undefined" && chrome.runtime?.getManifest
    ? chrome.runtime.getManifest()
    : null;
const extensionName = manifest?.name ?? "Extension";
const extensionVersion = manifest?.version ?? "0.0.0";

export function OptionsApp() {
  const [settings, setSettings] = useState<FocusSettings>(
    DEFAULT_FOCUS_SETTINGS
  );
  const [status, setStatus] = useState("");

  useEffect(() => {
    return subscribeToFocusSettings(setSettings);
  }, []);

  const handleFocusDefaultChange = (event: ChangeEvent<HTMLInputElement>) => {
    const focusModeEnabled = event.target.checked;
    setStatus("Saving...");
    void patchFocusSettings({ focusModeEnabled })
      .then(() => setStatus("Settings saved."))
      .catch(() => setStatus("Unable to save settings."));
  };

  return (
    <div className="min-h-screen bg-gray-950 px-6 py-8 text-white">
      <h1 className="text-lg font-semibold">{extensionName} Settings</h1>
      <div className="mt-4 max-w-md rounded-md border border-white/15 p-4">
        <label className="flex items-start gap-3 text-sm">
          <input
            checked={settings.focusModeEnabled}
            className="mt-1"
            type="checkbox"
            onChange={handleFocusDefaultChange}
          />
          <span>
            <span className="block font-semibold">
              Enable focus mode by default
            </span>
            <span className="mt-1 block text-xs text-gray-400">
              This only marks the YouTube home route as focus-ready. Feed
              replacement starts in the next task.
            </span>
          </span>
        </label>
      </div>
      {status ? (
        <p className="mt-3 text-xs text-gray-400">{status}</p>
      ) : null}
      <p className="mt-6 text-xs text-gray-500">
        Version {extensionVersion}
      </p>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <OptionsApp />
    </StrictMode>
  );
}
