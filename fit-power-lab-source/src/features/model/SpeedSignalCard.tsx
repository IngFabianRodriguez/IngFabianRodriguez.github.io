import { useMemo } from "react";
import { useAppActions } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BRAKING_DECELERATION, countBrakingEvents, detectBraking } from "@/domain/model/braking";
import { smoothSpeeds } from "@/domain/model/smoothing";
import { NumberField } from "@/features/model/NumberField";
import { useModelInputs } from "@/features/model/useModelInputs";

/** Ideas 28 and 29: speed smoothing and braking detection. */
export function SpeedSignalCard() {
  const { t } = useI18n();
  const { model, ride } = useModelInputs();
  const { setModel } = useAppActions();

  const brakingEvents = useMemo(() => {
    if (!ride) return null;
    const speeds = smoothSpeeds(ride.samples, model.speedSmoothingS);
    return countBrakingEvents(detectBraking(ride.samples, speeds));
  }, [ride, model.speedSmoothingS]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("model.signal.title")}</CardTitle>
        <CardDescription>{t("model.signal.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <NumberField
          id="model-smoothing"
          label={t("model.smoothing")}
          value={model.speedSmoothingS}
          min={0}
          max={30}
          decimals={0}
          hint={t("model.smoothing.hint")}
          onCommit={(speedSmoothingS) => setModel({ speedSmoothingS })}
        />
        <div className="grid gap-1.5">
          <div className="flex items-center gap-2">
            <Switch
              id="model-braking"
              checked={model.brakingDetection}
              onCheckedChange={(brakingDetection) => setModel({ brakingDetection })}
            />
            <Label htmlFor="model-braking">{t("model.braking")}</Label>
          </div>
          <p className="text-muted-foreground text-xs">
            {t("model.braking.hint", { limit: BRAKING_DECELERATION })}
          </p>
          {brakingEvents !== null ? (
            <p className="text-sm">{t("model.braking.found", { count: brakingEvents })}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
