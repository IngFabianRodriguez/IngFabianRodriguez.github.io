import { useMemo } from "react";
import { useAppActions } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WIND_PRESETS, matchPreset, type WindPresetId } from "@/domain/model/presets";
import { compassLabel, courseProfile } from "@/domain/model/wind";
import { NumberField } from "@/features/model/NumberField";
import { PresetGroup, type PresetOption } from "@/features/model/PresetGroup";
import { trimNumber } from "@/features/model/format";
import { useModelInputs } from "@/features/model/useModelInputs";
import { formatSpeed, speedUnit, speedValue } from "@/lib/units";

const KMH_PER_MS = 3.6;

/** Idea 24: wind speed and direction, entered or picked from a descriptive preset. */
export function WindCard() {
  const { t } = useI18n();
  const { model, units, ride } = useModelInputs();
  const { setModel } = useAppActions();

  const coverage = useMemo(() => {
    if (!ride) return null;
    const withCourse = courseProfile(ride).filter((c) => c !== undefined).length;
    return { withCourse, total: ride.samples.length };
  }, [ride]);

  const toDisplay = (ms: number) => speedValue(ms * KMH_PER_MS, units);
  const fromDisplay = (value: number) => value / speedValue(1, units) / KMH_PER_MS;

  const options: PresetOption<WindPresetId>[] = WIND_PRESETS.map((p) => ({
    id: p.id,
    label: t(`model.wind.${p.id}`),
    detail: p.value === 0 ? "" : `(${formatSpeed(p.value * KMH_PER_MS, units, 0)})`,
  }));
  const maxDisplay = toDisplay(25);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("model.wind.title")}</CardTitle>
        <CardDescription>{t("model.wind.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <PresetGroup
          name="wind"
          legend={t("model.wind.legend")}
          options={options}
          value={matchPreset(WIND_PRESETS, model.windSpeedMs)}
          onSelect={(id) => {
            const preset = WIND_PRESETS.find((p) => p.id === id);
            if (preset) setModel({ windSpeedMs: preset.value });
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            id="model-wind-speed"
            label={t("model.wind.speed", { unit: speedUnit(units) })}
            value={toDisplay(model.windSpeedMs)}
            min={0}
            max={Math.round(maxDisplay)}
            decimals={1}
            onCommit={(value) => setModel({ windSpeedMs: fromDisplay(value) })}
          />
          <NumberField
            id="model-wind-from"
            label={t("model.wind.from")}
            value={model.windFromDeg}
            min={0}
            max={360}
            decimals={0}
            hint={t("model.wind.fromLabel", {
              dir: t(`model.compass.${compassLabel(model.windFromDeg)}`),
              deg: trimNumber(model.windFromDeg, 0),
            })}
            onCommit={(windFromDeg) => setModel({ windFromDeg })}
          />
        </div>
        {coverage && model.windSpeedMs > 0 ? (
          coverage.withCourse === 0 ? (
            <p className="text-muted-foreground text-sm">{t("model.wind.noGps")}</p>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("model.wind.coverage", { count: coverage.withCourse, total: coverage.total })}
            </p>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
