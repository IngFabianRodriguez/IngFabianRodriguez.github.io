import { useId, useState } from "react";
import { useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { mergeFits } from "@/domain/tools/mergeFits";
import { ToolMessage, type ToolMessageProps } from "@/features/tools/ToolMessage";
import { derivedName, toolErrorKey, useAddDerivedRide } from "@/features/tools/toolRides";
import { formatDistance } from "@/lib/units";

export function MergeCard() {
  const { t } = useI18n();
  const { rides, units } = useAppState();
  const addDerived = useAddDerivedRide();
  const prefix = useId();
  const [chosen, setChosen] = useState<string[]>([]);
  const [message, setMessage] = useState<ToolMessageProps | null>(null);

  // A ride that was removed after being ticked must not be merged.
  const selected = rides.filter((r) => chosen.includes(r.id));

  function toggle(id: string, checked: boolean) {
    setChosen((current) => (checked ? [...current, id] : current.filter((c) => c !== id)));
  }

  function merge() {
    const earliest = [...selected].sort(
      (a, b) => a.ride.startTime.getTime() - b.ride.startTime.getTime(),
    )[0];
    if (!earliest) return;
    try {
      const name = derivedName(earliest.fileName, "merged");
      addDerived(mergeFits(selected.map((r) => r.fit)), name, "merged");
      setMessage({ kind: "ok", text: t("tools.added", { name }) });
    } catch (error) {
      setMessage({ kind: "error", text: t(toolErrorKey(error)) });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tools.merge.title")}</CardTitle>
        <CardDescription>{t("tools.merge.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {rides.length < 2 ? (
          <p className="text-muted-foreground text-sm">{t("tools.merge.need")}</p>
        ) : (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">{t("tools.merge.select")}</legend>
            {rides.map((r) => {
              const id = `${prefix}-${r.id}`;
              const km = (r.ride.samples.at(-1)?.distance ?? 0) / 1000;
              return (
                <div key={r.id} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={chosen.includes(r.id)}
                    onCheckedChange={(checked) => toggle(r.id, checked === true)}
                  />
                  <Label htmlFor={id}>
                    {r.fileName} ({formatDistance(km, units)})
                  </Label>
                </div>
              );
            })}
          </fieldset>
        )}
        <Button type="button" disabled={selected.length < 2} onClick={merge}>
          {t("tools.merge.create", { count: selected.length })}
        </Button>
        {message ? <ToolMessage {...message} /> : null}
      </CardContent>
    </Card>
  );
}
