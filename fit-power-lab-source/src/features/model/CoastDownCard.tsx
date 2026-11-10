import { useMemo } from "react";
import { useAppActions } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { estimateCoastDown } from "@/domain/model/coastDown";
import { NeedsRide } from "@/features/model/NeedsRide";
import { trimNumber } from "@/features/model/format";
import { useModelInputs } from "@/features/model/useModelInputs";

/** Idea 26: drag area and rolling resistance fitted from stretches coasted without pedalling. */
export function CoastDownCard() {
  const { t } = useI18n();
  const { ride, params } = useModelInputs();
  const { setModel } = useAppActions();

  const estimate = useMemo(
    () => (ride && params ? estimateCoastDown(ride, params) : null),
    [ride, params],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("model.coast.title")}</CardTitle>
        <CardDescription>{t("model.coast.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!ride || !params ? (
          <NeedsRide />
        ) : !estimate ? (
          <p className="text-muted-foreground text-sm">{t("model.coast.none")}</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              {t("model.coast.result", {
                cdA: trimNumber(estimate.cdA, 3),
                crr: trimNumber(estimate.crr, 4),
              })}
            </p>
            <p className="text-sm">
              {t("model.coast.quality", {
                quality: trimNumber(estimate.quality, 2),
                samples: estimate.samples,
              })}
            </p>
            {!estimate.reliable ? (
              <p className="text-destructive text-sm">{t("model.coast.unreliable")}</p>
            ) : null}
            <div>
              <Button
                type="button"
                disabled={!estimate.reliable}
                onClick={() => setModel({ cdA: estimate.cdA, crr: estimate.crr })}
              >
                {t("model.coast.apply")}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
