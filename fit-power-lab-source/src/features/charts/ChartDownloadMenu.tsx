import { DownloadIcon } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/app/I18nContext";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadPngImage, downloadSvgImage } from "@/features/share/imageExport";

interface ChartDownloadMenuProps {
  title: string;
  /** File name without extension. */
  baseName: string;
  /** The rendered svg of the chart, read when the user picks a format. */
  getSvg: () => SVGSVGElement | null;
}

/** A menu to download the chart as a PNG or an SVG image. */
export function ChartDownloadMenu({ title, baseName, getSvg }: ChartDownloadMenuProps) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);

  async function download(format: "png" | "svg") {
    const svg = getSvg();
    setFailed(false);
    if (!svg) {
      setFailed(true);
      return;
    }
    try {
      if (format === "svg") downloadSvgImage(svg, baseName);
      else await downloadPngImage(svg, baseName);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {failed ? (
        <p role="alert" className="text-destructive text-xs">
          {t("charts.download.failed")}
        </p>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={buttonVariants({ variant: "outline", size: "sm" })}
          aria-label={t("charts.download.label", { title })}
        >
          <DownloadIcon aria-hidden="true" />
          {t("charts.download.button")}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void download("png")}>
            {t("charts.download.png")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void download("svg")}>
            {t("charts.download.svg")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
