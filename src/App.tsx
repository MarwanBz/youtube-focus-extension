import { useState } from "react";

export default function App() {
  const [status, setStatus] = useState("");

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

  const handleToggleUi = () => {
    if (typeof chrome === "undefined") {
      return;
    }

    chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs?.[0]?.id;
      if (!tabId) {
        return;
      }

      chrome.tabs.sendMessage(tabId, { type: "TOGGLE_UI" }, () => {
        if (chrome.runtime.lastError) {
          setStatus("No overlay on this page.");
          return;
        }
        setStatus("");
      });
    });
  };

  const handleIncrementBadge = () => {
    if (typeof chrome === "undefined") {
      return;
    }
    chrome.runtime.sendMessage({ type: "INCREMENT_BADGE" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        setStatus("Could not update badge.");
        return;
      }
      setStatus("");
    });
  };

  return (
    <div className="w-[240px] p-3 bg-gray-900 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold">My Extension</h1>
        <button
          className="text-xs text-gray-400 hover:text-white"
          type="button"
          onClick={handleOpenOptions}
        >
          Settings
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
          type="button"
          onClick={handleToggleUi}
        >
          Overlay
        </button>
        <button
          className="inline-flex items-center justify-center rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
          type="button"
          onClick={handleIncrementBadge}
        >
          Badge +
        </button>
      </div>
      {status ? (
        <p className="mt-2 text-[11px] text-gray-400">{status}</p>
      ) : null}
    </div>
  );
}
