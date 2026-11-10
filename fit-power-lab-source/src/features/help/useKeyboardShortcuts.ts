import { useEffect, useRef } from "react";

export interface ShortcutBinding {
  /** The character produced by the key, for example "1", "u" or "?". Letters match in any case. */
  key: string;
  /** What the shortcut does, already translated. */
  description: string;
  handler: () => void;
}

/** True when the key press comes from somewhere the user is typing. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.contentEditable === "true") return true;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
  return ["textbox", "combobox", "searchbox", "spinbutton"].includes(
    target.getAttribute("role") ?? "",
  );
}

/**
 * Runs the handler of the pressed key anywhere in the page, except while the user types in a field
 * or holds Ctrl, Alt or Meta (those belong to the browser).
 */
export function useKeyboardShortcuts(bindings: ShortcutBinding[]): void {
  // The listener is added once; it always reads the bindings of the latest render.
  const latest = useRef(bindings);
  useEffect(() => {
    latest.current = bindings;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.altKey || event.metaKey || event.repeat) return;
      if (isTyping(event.target)) return;
      const pressed = event.key.toLowerCase();
      const match = latest.current.find((b) => b.key.toLowerCase() === pressed);
      if (!match) return;
      event.preventDefault();
      match.handler();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
