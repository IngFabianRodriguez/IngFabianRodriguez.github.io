import { useId, useState } from "react";
import { useI18n } from "@/app/I18nContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trimNumber } from "@/features/model/format";

interface NumberFieldProps {
  id: string;
  label: string;
  /** The value in the units shown; null leaves the field empty. */
  value: number | null;
  /** Called with every valid number typed, so the estimate follows while the user types. */
  onCommit: (value: number) => void;
  min: number;
  max: number;
  /** Decimals used when the value is written back into the field. */
  decimals?: number;
  hint?: string;
}

/** Reads a decimal typed with a point or a comma; null when it is not a plain number. */
function parse(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null;
}

const sameValue = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));

/**
 * A labelled number input that keeps what the user is typing ("0." is allowed on the way to
 * "0.4") and reports each valid number inside [min, max]. A value changed from outside, such as a
 * preset, replaces the text.
 */
export function NumberField({
  id,
  label,
  value,
  onCommit,
  min,
  max,
  decimals = 2,
  hint,
}: NumberFieldProps) {
  const { t } = useI18n();
  const messageId = useId();
  const [draft, setDraft] = useState(value === null ? "" : trimNumber(value, decimals));
  const [seen, setSeen] = useState(value);

  if (value !== seen) {
    setSeen(value);
    const typed = parse(draft);
    if (value !== null && (typed === null || !sameValue(typed, value))) {
      setDraft(trimNumber(value, decimals));
    }
  }

  const typed = parse(draft);
  const invalid = draft.trim() !== "" && (typed === null || typed < min || typed > max);
  const describedBy = invalid || hint ? messageId : undefined;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        value={draft}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          const next = parse(text);
          if (next !== null && next >= min && next <= max) onCommit(next);
        }}
      />
      {invalid ? (
        <p id={messageId} className="text-destructive text-xs">
          {t("model.field.invalid", {
            min: trimNumber(min, decimals),
            max: trimNumber(max, decimals),
          })}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
