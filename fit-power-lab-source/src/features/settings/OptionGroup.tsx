import { useId } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface Option<V extends string> {
  value: V;
  label: string;
}

interface OptionGroupProps<V extends string> {
  /** Id of the heading that names the group. */
  labelledBy: string;
  value: V;
  options: Option<V>[];
  onChange: (value: V) => void;
  /** Id of a text that explains the group, read after its name. */
  describedBy?: string;
}

/** One choice among a few, as radio buttons with a visible label each. */
export function OptionGroup<V extends string>({
  labelledBy,
  value,
  options,
  onChange,
  describedBy,
}: OptionGroupProps<V>) {
  const prefix = useId();
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as V)}
      aria-labelledby={labelledBy}
      {...(describedBy ? { "aria-describedby": describedBy } : {})}
    >
      {options.map((option) => (
        <div key={option.value} className="flex items-center gap-2">
          <RadioGroupItem id={`${prefix}-${option.value}`} value={option.value} />
          <Label htmlFor={`${prefix}-${option.value}`}>{option.label}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}
