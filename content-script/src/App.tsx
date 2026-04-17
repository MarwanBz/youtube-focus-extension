import { useEffect, useState } from "react";

type ToggleResponse = { visible: boolean };

export default function App() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handler = (
      message: { type?: string },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: ToggleResponse) => void
    ) => {
      if (message?.type !== "TOGGLE_UI") {
        return;
      }

      setIsVisible((prev) => {
        const next = !prev;
        sendResponse({ visible: next });
        return next;
      });

      return true;
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  const handleIncrementBadge = () => {
    if (typeof chrome === "undefined") {
      return;
    }
    chrome.runtime.sendMessage({ type: "INCREMENT_BADGE" });
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4">
        <button
          className="rounded-full border border-white/10 bg-gray-900 px-3 py-2 text-xs text-white shadow-lg hover:bg-gray-800"
          type="button"
          onClick={() => setIsVisible(true)}
        >
          Show
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-52 rounded-lg border border-white/10 bg-gray-900 p-3 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Overlay</p>
        <button
          className="text-xs text-gray-400 hover:text-white"
          type="button"
          onClick={() => setIsVisible(false)}
        >
          Hide
        </button>
      </div>
      <div className="mt-3">
        <button
          className="w-full rounded-md border border-white/10 px-2 py-1 text-xs text-white hover:bg-white/10"
          type="button"
          onClick={handleIncrementBadge}
        >
          Badge +
        </button>
      </div>
    </div>
  );
}
