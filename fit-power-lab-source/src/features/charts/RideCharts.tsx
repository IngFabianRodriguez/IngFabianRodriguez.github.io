import { useCallback, useMemo, useState } from "react";
import { useAppActions, useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { buttonVariants } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Ride } from "@/domain/ride";
import { SERIES_KEYS } from "@/domain/series";
import { detectStops, totalStoppedSeconds } from "@/domain/stops";
import { buildChartModel } from "@/domain/viz/chartModel";
import { ChartToolbar } from "@/features/charts/ChartToolbar";
import { CombinedChart } from "@/features/charts/CombinedChart";
import { SeriesCard } from "@/features/charts/SeriesCard";
import { formatDistance, formatDuration } from "@/lib/units";
import { cn } from "@/lib/utils";

interface RideChartsProps {
  ride: Ride;
  /** Estimated watts, aligned with `ride.samples`. */
  watts: number[];
  /** Start of the names of downloaded images. */
  fileBase?: string;
}

/**
 * The charts of a ride: one per variable, all on the same horizontal domain and ticks. Moving the
 * pointer over one sets the shared cursor, dragging selects a range for the whole app, and the
 * toolbar switches the axis between distance and time. A combined chart opens on demand.
 */
export function RideCharts({ ride, watts, fileBase = "ride" }: RideChartsProps) {
  const { t } = useI18n();
  const { units, xAxis, range } = useAppState();
  const { setCursorKm, setRange, setXAxis } = useAppActions();
  const [combinedOpen, setCombinedOpen] = useState(false);

  const model = useMemo(
    () => buildChartModel(ride, watts, { units, xAxis, range }),
    [ride, watts, units, xAxis, range],
  );
  const resetRange = useCallback(() => setRange(null), [setRange]);

  const rangeText = range
    ? t("charts.range.showing", {
        from: formatDistance(Math.min(range.fromKm, range.toKm), units, 2),
        to: formatDistance(Math.max(range.fromKm, range.toKm), units, 2),
      })
    : null;
  // The stops of the whole ride, whatever part is zoomed.
  const allStops = useMemo(() => detectStops(ride), [ride]);
  const missingLabels = SERIES_KEYS.filter((key) => model.missing.includes(key)).map((key) =>
    t(`charts.series.${key}`),
  );

  return (
    <section aria-label={t("charts.section")} className="grid gap-4">
      <ChartToolbar xAxis={xAxis} onXAxis={setXAxis} rangeText={rangeText} onReset={resetRange} />
      <p className="text-muted-foreground text-xs">
        {allStops.length > 0
          ? t("charts.stops.summary", {
              count: allStops.length,
              total: formatDuration(totalStoppedSeconds(allStops)),
            })
          : t("charts.stops.none")}
      </p>
      {model.series.map((series) => (
        <SeriesCard
          key={series.key}
          series={series}
          model={model}
          fileBase={fileBase}
          onCursorKm={setCursorKm}
          onRange={setRange}
        />
      ))}
      <Collapsible open={combinedOpen} onOpenChange={setCombinedOpen} className="grid gap-4">
        <CollapsibleTrigger className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
          {combinedOpen ? t("charts.combined.hide") : t("charts.combined.show")}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CombinedChart
            ride={ride}
            watts={watts}
            model={model}
            fileBase={fileBase}
            onCursorKm={setCursorKm}
            onRange={setRange}
          />
        </CollapsibleContent>
      </Collapsible>
      {missingLabels.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("charts.notRecorded", { list: missingLabels.join(", ") })}
        </p>
      ) : null}
    </section>
  );
}
