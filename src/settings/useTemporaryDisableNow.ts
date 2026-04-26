import { useEffect, useState } from "react";

import { getTemporaryDisableDelayMs } from "./temporary-disable";

export function useTemporaryDisableNow(disabledUntil: string | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const nextNow = Date.now();
    setNow(nextNow);

    const delay = getTemporaryDisableDelayMs(disabledUntil, nextNow);
    if (delay === null) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setNow(Date.now());
    }, delay);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [disabledUntil]);

  return now;
}
