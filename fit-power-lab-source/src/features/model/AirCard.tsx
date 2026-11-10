import { useMemo } from "react";
import { useAppActions } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberField } from "@/features/model/NumberField";
import { useModelInputs } from "@/features/model/useModelInputs";
import { formatTemperature, temperatureUnit } from "@/lib/units";

const MAX_OFFSET_C = 20;

/** Ideas 30 and 31: the temperature correction and the use of a real pressure when a file has it. */
export function AirCard() {
  const { t } = useI18n();
  const { model, units, ride } = useModelInputs();
  const { setModel } = useAppActions();
  const imperial = units === "imperial";
  // A temperature difference converts by the scale factor only (no +32).
  const toDisplay = (celsius: number) => (imperial ? (celsius * 9) / 5 : celsius);
  const fromDisplay = (value: number) => (imperial ? (value * 5) / 9 : value);

  const facts = useMemo(() => {
    if (!ride) return null;
    const temperatures = ride.samples.flatMap((s) =>
      s.temperature === undefined ? [] : [s.temperature],
    );
    const mean = temperatures.length
      ? temperatures.reduce((sum, v) => sum + v, 0) / temperatures.length
      : null;
    return { mean, pressureSamples: ride.samples.filter((s) => s.pressurePa !== undefined).length };
  }, [ride]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("model.air.title")}</CardTitle>
        <CardDescription>{t("model.air.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <NumberField
          id="model-temp-offset"
          label={t("model.temp.offset", { unit: temperatureUnit(units) })}
          value={toDisplay(model.temperatureOffsetC)}
          min={-toDisplay(MAX_OFFSET_C)}
          max={toDisplay(MAX_OFFSET_C)}
          decimals={1}
          hint={t("model.temp.hint")}
          onCommit={(value) => setModel({ temperatureOffsetC: fromDisplay(value) })}
        />
        {facts ? (
          <>
            <p className="text-sm">
              {facts.mean === null
                ? t("model.temp.none")
                : t("model.temp.ride", {
                    device: formatTemperature(facts.mean, units, 1),
                    used: formatTemperature(facts.mean - model.temperatureOffsetC, units, 1),
                  })}
            </p>
            <p className="text-muted-foreground text-sm">
              {facts.pressureSamples > 0
                ? t("model.pressure.some", { count: facts.pressureSamples })
                : t("model.pressure.none")}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">{t("model.pressure.none")}</p>
        )}
      </CardContent>
    </Card>
  );
}
