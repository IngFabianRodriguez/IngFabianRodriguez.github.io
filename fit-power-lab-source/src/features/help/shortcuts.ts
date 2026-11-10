import type { Translator } from "@/app/i18n";
import type { ShortcutBinding } from "@/features/help/useKeyboardShortcuts";

export type ShortcutId =
  | "overview"
  | "metrics"
  | "model"
  | "library"
  | "tools"
  | "device"
  | "settings"
  | "help"
  | "units"
  | "theme";

export interface ShortcutDoc {
  id: ShortcutId;
  key: string;
  /** Translation key of the description. */
  labelKey: string;
  /** Translation key of the section name, for the shortcuts that go to a section. */
  sectionKey?: string;
}

const section = (id: ShortcutId, key: string): ShortcutDoc => ({
  id,
  key,
  labelKey: "help.shortcut.section",
  sectionKey: `app.tab.${id}`,
});

/** The one list of shortcuts: the settings panel shows it and the shell binds handlers to it. */
export const SHORTCUT_DOCS: ShortcutDoc[] = [
  section("overview", "1"),
  section("metrics", "2"),
  section("model", "3"),
  section("library", "4"),
  section("tools", "5"),
  section("device", "6"),
  section("settings", "7"),
  { id: "help", key: "?", labelKey: "help.shortcut.help" },
  { id: "units", key: "u", labelKey: "help.shortcut.units" },
  { id: "theme", key: "d", labelKey: "help.shortcut.theme" },
];

export function describeShortcut(doc: ShortcutDoc, t: Translator): string {
  return doc.sectionKey ? t(doc.labelKey, { section: t(doc.sectionKey) }) : t(doc.labelKey);
}

/** Bindings for the shortcuts that have a handler; the shell gives only the ones it can run. */
export function createShortcutBindings(
  handlers: Partial<Record<ShortcutId, () => void>>,
  t: Translator,
): ShortcutBinding[] {
  return SHORTCUT_DOCS.flatMap((doc) => {
    const handler = handlers[doc.id];
    return handler ? [{ key: doc.key, description: describeShortcut(doc, t), handler }] : [];
  });
}
