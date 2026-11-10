import { useI18n } from "@/app/I18nContext";
import type { XAxis } from "@/app/appState";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ChartToolbarProps {
  xAxis: XAxis;
  onXAxis: (axis: XAxis) => void;
  /** Text describing the selected range, or null when the whole ride is shown. */
  rangeText: string | null;
  onReset: () => void;
}

/** What applies to every chart at once: the horizontal axis and the zoom. */
export function ChartToolbar({ xAxis, onXAxis, rangeText, onReset }: ChartToolbarProps) {
  const { t } = useI18n();

  return (
    <div role="group" aria-label={t("charts.toolbar.label")} className="grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          value={xAxis}
          onValueChange={(value) => {
            if (value === "distance" || value === "time") onXAxis(value);
          }}
          aria-label={t("charts.xAxis.label")}
        >
          <ToggleGroupItem value="distance">{t("charts.xAxis.distance")}</ToggleGroupItem>
          <ToggleGroupItem value="time">{t("charts.xAxis.time")}</ToggleGroupItem>
        </ToggleGroup>
        {rangeText ? (
          <>
            <span className="text-sm">{rangeText}</span>
            <Button variant="outline" size="sm" onClick={onReset}>
              {t("charts.range.reset")}
            </Button>
          </>
        ) : (
          <span className="text-muted-foreground text-xs">{t("charts.range.hint")}</span>
        )}
      </div>
    </div>
  );
}
