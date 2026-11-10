import { PrinterIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/app/I18nContext";
import { Button } from "@/components/ui/button";
import type { Analysis } from "@/domain/analysis";
import { ReportView } from "@/features/share/ReportView";

interface PrintReportButtonProps {
  analysis: Pick<Analysis, "ride" | "watts">;
  fileName: string;
}

const PRINT_STYLE =
  "@page { margin: 12mm; } @media print { body > *:not(#print-report-root) { display: none !important; } }";

/**
 * Prints the report of the ride: it puts the report in the page for the moment of printing, hides
 * everything else from the printed page, and opens the browser's print dialog, where "Save as PDF"
 * gives the PDF. Nothing leaves the browser.
 */
export function PrintReportButton({ analysis, fileName }: PrintReportButtonProps) {
  const { t } = useI18n();
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!printing) return;
    const finish = () => setPrinting(false);
    window.addEventListener("afterprint", finish);
    // Wait a tick so the report is in the page before the browser lays it out for printing.
    const id = setTimeout(() => window.print(), 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener("afterprint", finish);
    };
  }, [printing]);

  return (
    <div className="grid gap-1">
      <Button variant="outline" className="w-fit" onClick={() => setPrinting(true)}>
        <PrinterIcon aria-hidden="true" />
        {t("share.print.button")}
      </Button>
      <p className="text-muted-foreground text-xs">{t("share.print.hint")}</p>
      {printing
        ? createPortal(
            <div id="print-report-root" className="hidden print:block">
              <style>{PRINT_STYLE}</style>
              <ReportView analysis={analysis} fileName={fileName} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
