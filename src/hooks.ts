import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Tracks whether the popover window is currently visible/focused.
 * Used to pause polling when the popover is hidden (battery/CPU saving).
 */
export function useWindowActive(): boolean {
  const [active, setActive] = useState(true);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => setActive(focused))
      .then((fn) => {
        unlisten = fn;
      });

    const onVisibility = () => setActive(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      unlisten?.();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return active;
}

const POLL_KEY = "portwatch.pollIntervalMs";
const DEFAULT_POLL = 3000;
const MIN_POLL = 1000;
const MAX_POLL = 10000;

export function usePollInterval(): [number, (ms: number) => void] {
  const [ms, setMs] = useState<number>(() => {
    const stored = Number(localStorage.getItem(POLL_KEY));
    return stored >= MIN_POLL && stored <= MAX_POLL ? stored : DEFAULT_POLL;
  });

  const update = (next: number) => {
    const clamped = Math.min(MAX_POLL, Math.max(MIN_POLL, next));
    localStorage.setItem(POLL_KEY, String(clamped));
    setMs(clamped);
  };

  return [ms, update];
}
