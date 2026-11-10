import { useCallback, useEffect, useState } from "react";

export const ONBOARDING_STORAGE_KEY = "fit-power-web.onboarding";
/** Lets a "show again" button anywhere open the dialog that the shell mounts. */
const SHOW_EVENT = "fit-power-web:show-onboarding";

/** True only for a saved `{ "seen": true }`; anything else, or no storage, counts as not seen. */
function wasSeen(): boolean {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return false;
    const data: unknown = JSON.parse(raw);
    return (
      typeof data === "object" &&
      data !== null &&
      !Array.isArray(data) &&
      (data as Record<string, unknown>)["seen"] === true
    );
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ seen: true }));
  } catch {
    // Without storage the introduction is simply shown again next time.
  }
}

export interface Onboarding {
  open: boolean;
  /** Closing it remembers that the introduction was seen. */
  setOpen: (open: boolean) => void;
  /** Opens the introduction again, wherever the dialog is mounted. */
  show: () => void;
}

/** Whether the introduction is showing: it opens the first time and whenever `show` is called. */
export function useOnboarding(): Onboarding {
  const [open, setOpenState] = useState(() => !wasSeen());

  const setOpen = useCallback((value: boolean) => {
    setOpenState(value);
    if (!value) markSeen();
  }, []);

  const show = useCallback(() => {
    window.dispatchEvent(new Event(SHOW_EVENT));
  }, []);

  useEffect(() => {
    const onShow = () => setOpenState(true);
    window.addEventListener(SHOW_EVENT, onShow);
    return () => window.removeEventListener(SHOW_EVENT, onShow);
  }, []);

  return { open, setOpen, show };
}
