import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/app/I18nContext";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Analysis } from "@/domain/analysis";
import { toCsv } from "@/domain/exporters/csv";
import { baseName, exportFileName } from "@/domain/exporters/fileName";
import { toGpx } from "@/domain/exporters/gpx";
import { toJson, type JsonOptions } from "@/domain/exporters/json";
import { toTcx } from "@/domain/exporters/tcx";
import { outputFileName, writeFitWithPower, type WriteFitOptions } from "@/fit/writeFit";
import { downloadFile } from "@/lib/download";

interface ExportButtonProps {
  analysis: Analysis;
  /** Name of the file the ride was read from. */
  fileName: string;
  /** What the power was estimated with; the JSON export records it when given. */
  settings?: NonNullable<JsonOptions["settings"]>;
}

const download = (text: string, name: string) => downloadFile(new TextEncoder().encode(text), name);

export function ExportButton({ analysis, fileName, settings }: ExportButtonProps) {
  const { t } = useI18n();
  const [fitOptions, setFitOptions] = useState<Required<WriteFitOptions>>({
    updateSummary: false,
    // On by default: without the flag the app cannot tell its own estimate from a meter reading
    // when the exported file is opened again.
    markEstimated: true,
    newIdentity: false,
  });
  const { ride, watts } = analysis;
  const hasGps = ride.samples.some((s) => s.lat !== undefined);

  function downloadFit() {
    const bytes = writeFitWithPower(analysis.fit, ride, watts, fitOptions);
    downloadFile(bytes, outputFileName(fileName));
  }

  const toggle = (key: keyof WriteFitOptions) => (checked: boolean) =>
    setFitOptions((current) => ({ ...current, [key]: checked }));
  // Toggling an option must not close the menu.
  const keepOpen = (event: Event) => event.preventDefault();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" onClick={downloadFit}>
        {t("export.download")}
      </Button>
      <DropdownMenu>
        {/* No `asChild`: the shadcn Button does not forward refs under React 18, and the menu
            needs the trigger's ref to position itself. */}
        <DropdownMenuTrigger className={buttonVariants({ variant: "outline" })}>
          {t("export.more")}
          <ChevronDownIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        {/* Above the Leaflet map, whose panes and controls reach z-index 1000. */}
        <DropdownMenuContent align="start" className="w-72" style={{ zIndex: 1100 }}>
          <DropdownMenuLabel>{t("export.formats")}</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => download(toCsv(ride, watts), exportFileName(fileName, "csv"))}
          >
            {t("export.csv")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!hasGps}
            onSelect={() =>
              download(
                toGpx(ride, watts, { name: baseName(fileName) }),
                exportFileName(fileName, "gpx"),
              )
            }
          >
            {hasGps ? t("export.gpx") : t("export.gpxNoGps")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => download(toTcx(ride, watts), exportFileName(fileName, "tcx"))}
          >
            {t("export.tcx")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              download(
                toJson(ride, watts, { fileName, ...(settings ? { settings } : {}) }),
                exportFileName(fileName, "json"),
              )
            }
          >
            {t("export.json")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("export.fitOptions")}</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={fitOptions.updateSummary}
            onCheckedChange={toggle("updateSummary")}
            onSelect={keepOpen}
          >
            {t("export.updateSummary")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={fitOptions.markEstimated}
            onCheckedChange={toggle("markEstimated")}
            onSelect={keepOpen}
          >
            {t("export.markEstimated")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={fitOptions.newIdentity}
            onCheckedChange={toggle("newIdentity")}
            onSelect={keepOpen}
          >
            {t("export.newIdentity")}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
