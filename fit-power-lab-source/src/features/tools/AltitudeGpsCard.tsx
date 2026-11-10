import { useId, useMemo, useState } from "react";
import { useActiveRide } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { correctElevation, elevationAnchors } from "@/domain/tools/correctElevation";
import { createElevationLookup } from "@/domain/tools/elevationService";
import { DEFAULT_SMOOTHING_SAMPLES, smoothGps } from "@/domain/tools/smoothGps";
import { ToolMessage, type ToolMessageProps } from "@/features/tools/ToolMessage";
import { derivedName, toolErrorKey, useAddDerivedRide } from "@/features/tools/toolRides";

export function AltitudeGpsCard() {
  const { t } = useI18n();
  const active = useActiveRide();
  const addDerived = useAddDerivedRide();
  const windowId = useId();
  const helpId = useId();

  const [windowSize, setWindowSize] = useState(String(DEFAULT_SMOOTHING_SAMPLES));
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<ToolMessageProps | null>(null);

  const anchorCount = useMemo(() => (active ? elevationAnchors(active.fit).length : 0), [active]);
  const hasGps = anchorCount > 0;

  function smooth() {
    if (!active) return;
    const typed = Math.round(Number(windowSize));
    const records = Math.min(15, Math.max(1, typed || DEFAULT_SMOOTHING_SAMPLES));
    try {
      const name = derivedName(active.fileName, "smoothed");
      addDerived(smoothGps(active.fit, records), name);
      setMessage({ kind: "ok", text: t("tools.added", { name }) });
    } catch (error) {
      setMessage({ kind: "error", text: t(toolErrorKey(error)) });
    }
  }

  async function correct() {
    if (!active) return;
    setConfirming(false);
    setWorking(true);
    setMessage(null);
    try {
      const fit = await correctElevation(active.fit, createElevationLookup());
      const name = derivedName(active.fileName, "elevation");
      addDerived(fit, name);
      setMessage({ kind: "ok", text: t("tools.added", { name }) });
    } catch (error) {
      setMessage({ kind: "error", text: t(toolErrorKey(error)) });
    } finally {
      setWorking(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tools.altitude.title")}</CardTitle>
        <CardDescription>{t("tools.altitude.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor={windowId}>{t("tools.gps.window")}</Label>
          <Input
            id={windowId}
            type="number"
            min={1}
            max={15}
            step={2}
            inputMode="numeric"
            aria-describedby={helpId}
            value={windowSize}
            disabled={!hasGps}
            onChange={(event) => setWindowSize(event.target.value)}
          />
          <p id={helpId} className="text-muted-foreground text-xs">
            {t("tools.gps.help")}
          </p>
        </div>
        <Button type="button" disabled={!hasGps} onClick={smooth}>
          {t("tools.gps.smooth")}
        </Button>

        <Separator />

        {/* A standing notice, not an alert: it must not be announced as an error. */}
        <Alert role="note">
          <AlertTitle>{t("tools.elev.warningTitle")}</AlertTitle>
          <AlertDescription>{t("tools.elev.warning", { count: anchorCount })}</AlertDescription>
        </Alert>
        {confirming ? (
          <div className="grid gap-3">
            <p className="text-sm font-medium">
              {t("tools.elev.confirmText", { count: anchorCount })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void correct()}>
                {t("tools.elev.confirm")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
                {t("tools.elev.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={!hasGps || working}
            onClick={() => setConfirming(true)}
          >
            {working ? t("tools.elev.working") : t("tools.elev.start")}
          </Button>
        )}
        {!hasGps && active ? <ToolMessage kind="error" text={t("tools.error.noGps")} /> : null}
        {message ? <ToolMessage {...message} /> : null}
      </CardContent>
    </Card>
  );
}
