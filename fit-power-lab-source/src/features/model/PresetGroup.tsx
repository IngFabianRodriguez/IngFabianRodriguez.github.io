import { useId } from "react";
import { useI18n } from "@/app/I18nContext";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface PresetOption<Id extends string> {
  id: Id;
  label: string;
  /** The value the preset sets, shown next to its name. */
  detail: string;
}

interface PresetGroupProps<Id extends string> {
  /** Prefix of the element ids, unique on the page. */
  name: string;
  legend: string;
  options: PresetOption<Id>[];
  /** The preset whose value the model holds now, or "custom" when it matches none. */
  value: Id | "custom";
  onSelect: (id: Id) => void;
}

/** A labelled group of radio buttons, one per preset; none is checked for a custom value. */
export function PresetGroup<Id extends string>({
  name,
  legend,
  options,
  value,
  onSelect,
}: PresetGroupProps<Id>) {
  const { t } = useI18n();
  const legendId = useId();

  return (
    <div className="grid gap-2">
      <p id={legendId} className="text-sm font-medium">
        {legend}
      </p>
      <RadioGroup
        aria-labelledby={legendId}
        value={value === "custom" ? "" : value}
        onValueChange={(next) => {
          const chosen = options.find((o) => o.id === next);
          if (chosen) onSelect(chosen.id);
        }}
      >
        {options.map((option) => (
          <div key={option.id} className="flex items-center gap-2">
            <RadioGroupItem id={`${name}-${option.id}`} value={option.id} />
            <Label htmlFor={`${name}-${option.id}`} className="font-normal">
              {option.label}
              <span className="text-muted-foreground"> {option.detail}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>
      {value === "custom" ? (
        <p className="text-muted-foreground text-xs">{t("model.preset.custom")}</p>
      ) : null}
    </div>
  );
}
