import { useId, useState } from "react";
import { useActiveRide, useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trimFit, type TrimOptions } from "@/domain/tools/trimFit";
import { ToolMessage, type ToolMessageProps } from "@/features/tools/ToolMessage";
import { derivedName, toolErrorKey, useAddDerivedRide } from "@/features/tools/toolRides";
import { distanceUnit, distanceValue, formatDistance } from "@/lib/units";

export function TrimCard() {
  const { t } = useI18n();
  const { units, range } = useAppState();
  const active = useActiveRide();
  const addDerived = useAddDerivedRide();
  const ids = { from: useId(), to: useId(), range: useId(), pauses: useId() };

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [useRange, setUseRange] = useState(false);
  const [removePauses, setRemovePauses] = useState(false);
  const [message, setMessage] = useState<ToolMessageProps | null>(null);

  const selected = useRange ? range : null;
  const totalKm = (active?.ride.samples.at(-1)?.distance ?? 0) / 1000;
  /** What the user typed, in the chosen unit, as kilometers; undefined when empty or not a number. */
  const toKm = (value: string): number | undefined => {
    const number = Number(value);
    return value.trim() === "" || Number.isNaN(number)
      ? undefined
      : number / distanceValue(1, units);
  };
  const shown = (km: number) => String(Number(distanceValue(km, units).toFixed(2)));

  function create() {
    if (!active) return;
    const options: TrimOptions = { removePauses };
    const fromKm = selected ? selected.fromKm : toKm(from);
    const upToKm = selected ? selected.toKm : toKm(to);
    if (fromKm !== undefined) options.fromKm = fromKm;
    if (upToKm !== undefined) options.toKm = upToKm;
    try {
      const name = derivedName(active.fileName, "trimmed");
      addDerived(trimFit(active.fit, options), name);
      setMessage({ kind: "ok", text: t("tools.added", { name }) });
    } catch (error) {
      setMessage({ kind: "error", text: t(toolErrorKey(error)) });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tools.trim.title")}</CardTitle>
        <CardDescription>{t("tools.trim.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor={ids.from}>{t("tools.trim.from", { unit: distanceUnit(units) })}</Label>
            <Input
              id={ids.from}
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              placeholder={t("tools.trim.fromPlaceholder")}
              value={selected ? shown(selected.fromKm) : from}
              disabled={selected !== null || !active}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={ids.to}>{t("tools.trim.to", { unit: distanceUnit(units) })}</Label>
            <Input
              id={ids.to}
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              placeholder={t("tools.trim.toPlaceholder", {
                total: formatDistance(totalKm, units, 2),
              })}
              value={selected ? shown(selected.toKm) : to}
              disabled={selected !== null || !active}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={ids.range}
            checked={selected !== null}
            disabled={range === null || !active}
            onCheckedChange={(checked) => setUseRange(checked === true)}
          />
          <Label htmlFor={ids.range}>
            {range
              ? t("tools.trim.useRange", {
                  from: formatDistance(range.fromKm, units, 2),
                  to: formatDistance(range.toKm, units, 2),
                })
              : t("tools.trim.noRange")}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id={ids.pauses}
            checked={removePauses}
            disabled={!active}
            onCheckedChange={setRemovePauses}
          />
          <Label htmlFor={ids.pauses}>{t("tools.trim.removePauses")}</Label>
        </div>
        <Button type="button" disabled={!active} onClick={create}>
          {t("tools.trim.create")}
        </Button>
        {message ? <ToolMessage {...message} /> : null}
      </CardContent>
    </Card>
  );
}
