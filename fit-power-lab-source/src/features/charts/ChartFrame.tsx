import { useId, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/app/I18nContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChartDataTable, type ChartTable } from "@/features/charts/ChartDataTable";
import { ChartDownloadMenu } from "@/features/charts/ChartDownloadMenu";

interface ChartFrameProps {
  title: string;
  /** Under the title; the unit for a single variable. */
  description: ReactNode;
  /** File name of the downloaded images, without extension. */
  downloadName: string;
  /** Builds the table of plotted points; only called when the table is shown. */
  buildTable: () => ChartTable;
  /** Small print under the chart: summary figures, legends. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * The card every chart sits in: title, a download menu (PNG or SVG), a switch that swaps the
 * chart for the numbers it draws, and the room for a summary and a legend.
 */
export function ChartFrame({
  title,
  description,
  downloadName,
  buildTable,
  footer,
  children,
}: ChartFrameProps) {
  const { t } = useI18n();
  const switchId = useId();
  const plot = useRef<HTMLDivElement>(null);
  const [viewData, setViewData] = useState(false);
  const table = viewData ? buildTable() : null;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div className="grid gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id={switchId}
              size="sm"
              checked={viewData}
              onCheckedChange={setViewData}
              aria-label={t("charts.data.toggleFor", { title })}
            />
            <Label htmlFor={switchId} className="text-xs">
              {t("charts.data.toggle")}
            </Label>
          </div>
          <ChartDownloadMenu
            title={title}
            baseName={downloadName}
            getSvg={() =>
              plot.current?.querySelector<SVGSVGElement>("svg.recharts-surface") ?? null
            }
          />
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div ref={plot} className={viewData ? "hidden" : undefined}>
          {children}
        </div>
        {table ? (
          <ChartDataTable
            caption={t("charts.data.caption", { title })}
            table={table}
            note={t("charts.data.showing", { shown: table.rows.length, total: table.total })}
          />
        ) : null}
        {footer}
      </CardContent>
    </Card>
  );
}
