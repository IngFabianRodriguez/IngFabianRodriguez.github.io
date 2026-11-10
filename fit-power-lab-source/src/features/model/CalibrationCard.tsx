import { useMemo, useState } from "react";
import { useAppActions, useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calibrate } from "@/domain/model/calibrate";
import { NeedsRide } from "@/features/model/NeedsRide";
import { NumberField } from "@/features/model/NumberField";
import { trimNumber } from "@/features/model/format";
import { useModelInputs } from "@/features/model/useModelInputs";
import { formatDistance } from "@/lib/units";

/** Idea 25: a factor that makes the estimate match the known power of a stretch. */
export function CalibrationCard() {
  const { t } = useI18n();
  const { model, units, ride, params } = useModelInputs();
  const { range } = useAppState();
  const { setModel } = useAppActions();
  const [known, setKnown] = useState<number | null>(null);

  const result = useMemo(
    () => (ride && params && known !== null ? calibrate(ride, params, known, range) : null),
    [ride, params, known, range],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("model.calibrate.title")}</CardTitle>
        <CardDescription>{t("model.calibrate.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!ride || !params ? (
          <NeedsRide />
        ) : (
          <>
            <p className="text-sm">
              {range
                ? t("model.calibrate.stretchRange", {
                    from: formatDistance(Math.min(range.fromKm, range.toKm), units, 2),
                    to: formatDistance(Math.max(range.fromKm, range.toKm), units, 2),
                  })
                : t("model.calibrate.stretchWhole")}
            </p>
            <NumberField
              id="model-calibrate-known"
              label={t("model.calibrate.known")}
              value={known}
              min={1}
              max={2000}
              decimals={0}
              onCommit={setKnown}
            />
            {known !== null && !result ? (
              <p className="text-muted-foreground text-sm">{t("model.calibrate.none")}</p>
            ) : null}
            {result ? (
              <>
                <p className="text-sm" role="status">
                  {t("model.calibrate.result", {
                    estimated: Math.round(result.estimatedAvgW),
                    known: trimNumber(result.knownAvgW, 0),
                    factor: trimNumber(result.factor, 3),
                  })}
                </p>
                {!result.plausible ? (
                  <p className="text-destructive text-sm">{t("model.calibrate.implausible")}</p>
                ) : null}
              </>
            ) : null}
          </>
        )}
        <p className="text-sm">
          {t("model.calibrate.current", { factor: trimNumber(model.calibrationFactor, 3) })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!result}
            onClick={() => result && setModel({ calibrationFactor: result.factor })}
          >
            {t("model.calibrate.apply")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={model.calibrationFactor === 1}
            onClick={() => setModel({ calibrationFactor: 1 })}
          >
            {t("model.calibrate.remove")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
