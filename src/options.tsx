import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "@lib/styles/globals.css";

const manifest =
  typeof chrome !== "undefined" && chrome.runtime?.getManifest
    ? chrome.runtime.getManifest()
    : null;
const extensionName = manifest?.name ?? "Extension";
const extensionVersion = manifest?.version ?? "0.0.0";

function OptionsApp() {
  const [status, setStatus] = useState("");

  const handleResetBadge = () => {
    if (typeof chrome === "undefined") {
      return;
    }
    chrome.runtime.sendMessage({ type: "RESET_BADGE" }, () => {
      if (chrome.runtime.lastError) {
        setStatus("Unable to reset badge.");
        return;
      }
      setStatus("Badge cleared.");
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 px-6 py-8 text-white">
      <h1 className="text-lg font-semibold">{extensionName} Settings</h1>
      <div className="mt-4">
        <button
          className="inline-flex items-center rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
          type="button"
          onClick={handleResetBadge}
        >
          Reset badge count
        </button>
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
