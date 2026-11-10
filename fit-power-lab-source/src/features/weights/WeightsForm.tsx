import { useState, type FormEvent } from "react";
import { useUnits } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  parseWeightsInput,
  type WeightFieldError,
  type WeightInputErrors,
  type Weights,
} from "@/domain/weights";
import { weightUnit, weightValue } from "@/lib/units";

interface WeightsFormProps {
  /** Last used weights (in kilograms), shown as the starting values. */
  initial: Weights | null;
  /** Called with the confirmed weights, always in kilograms. */
  onSubmit: (weights: Weights) => void;
}

export function WeightsForm({ initial, onSubmit }: WeightsFormProps) {
  const { t } = useI18n();
  const units = useUnits();
  const unit = weightUnit(units);
  const shown = (kg: number) => String(Number(weightValue(kg, units).toFixed(1)));

  const [rider, setRider] = useState(initial ? shown(initial.riderKg) : "");
  const [bike, setBike] = useState(initial ? shown(initial.bikeKg) : "");
  const [errors, setErrors] = useState<WeightInputErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = parseWeightsInput(rider, bike, units);
    if (result.ok) {
      setErrors({});
      onSubmit(result.weights);
    } else {
      setErrors(result.errors);
    }
  }

  const message = (field: "rider" | "bike", error: WeightFieldError | undefined) => {
    if (!error) return null;
    return error.code === "required"
      ? t(`weights.error.${field}Required`, { unit })
      : t(`weights.error.${field}Range`, { min: error.min, max: error.max, unit });
  };
  const riderError = message("rider", errors.rider);
  const bikeError = message("bike", errors.bike);

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("weights.title")}</CardTitle>
        <CardDescription>{t("weights.description")}</CardDescription>
      </CardHeader>
      {/* `contents` keeps the card's own spacing between the fields and the footer. */}
      <form onSubmit={handleSubmit} noValidate className="contents">
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="rider-weight">{t("weights.rider", { unit })}</Label>
            <Input
              id="rider-weight"
              inputMode="decimal"
              value={rider}
              onChange={(event) => setRider(event.target.value)}
              aria-invalid={riderError !== null}
              aria-describedby={riderError ? "rider-weight-error" : undefined}
            />
            {riderError ? (
              <p id="rider-weight-error" className="text-destructive text-sm">
                {riderError}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bike-weight">{t("weights.bike", { unit })}</Label>
            <Input
              id="bike-weight"
              inputMode="decimal"
              value={bike}
              onChange={(event) => setBike(event.target.value)}
              aria-invalid={bikeError !== null}
              aria-describedby={bikeError ? "bike-weight-error" : undefined}
            />
            {bikeError ? (
              <p id="bike-weight-error" className="text-destructive text-sm">
                {bikeError}
              </p>
            ) : null}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit">{t("weights.continue")}</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
