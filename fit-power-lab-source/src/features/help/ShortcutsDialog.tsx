import { useState } from "react";
import { useI18n } from "@/app/I18nContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useKeyboardShortcuts, type ShortcutBinding } from "@/features/help/useKeyboardShortcuts";

interface ShortcutsDialogProps {
  /** The shortcuts the shell has set up; the dialog adds the one that opens it. */
  bindings: ShortcutBinding[];
}

/** The list of keyboard shortcuts, opened and closed with the "?" key. */
export function ShortcutsDialog({ bindings }: ShortcutsDialogProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useKeyboardShortcuts([
    { key: "?", description: t("help.shortcut.help"), handler: () => setOpen((o) => !o) },
  ]);

  const rows = bindings.some((b) => b.key === "?")
    ? bindings
    : [...bindings, { key: "?", description: t("help.shortcut.help"), handler: () => undefined }];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("help.shortcuts.title")}</DialogTitle>
          <DialogDescription>{t("help.shortcuts.description")}</DialogDescription>
        </DialogHeader>
        <ul className="grid gap-2">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center gap-3">
              <kbd className="bg-muted min-w-8 rounded border px-2 py-0.5 text-center font-mono text-xs">
                {row.key}
              </kbd>
              <span>{row.description}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
