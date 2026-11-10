import { useI18n } from "@/app/I18nContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  qualityBand,
  type QualityFinding,
  type QualityReport,
  type QualitySeverity,
} from "@/domain/quality/assessQuality";
import { formatAltitude, formatDuration, type UnitSystem } from "@/lib/units";

export interface QualityCardProps {
  /** Null when no ride is loaded. */
  report: QualityReport | null;
  units: UnitSystem;
}

const BADGE: Record<QualitySeverity, "secondary" | "outline" | "destructive"> = {
  info: "secondary",
  warning: "outline",
  problem: "destructive",
};

export function QualityCard({ report, units }: QualityCardProps) {
  const { t } = useI18n();

  function describe(finding: QualityFinding): string {
    const detail = finding.detail ?? 0;
    const text =
      finding.code === "altitude-jumps"
        ? formatAltitude(detail, units, 1)
        : finding.code === "gaps" || finding.code === "pauses"
          ? formatDuration(detail)
          : String(detail);
    return t(`device.quality.${finding.code}`, { count: finding.count ?? 0, detail: text });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("device.quality.title")}</CardTitle>
        <CardDescription>{t("device.quality.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {report === null ? (
          <p className="text-muted-foreground text-sm">{t("device.quality.noRide")}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-3xl font-semibold">
                <span className="sr-only">{t("device.quality.score")}: </span>
                {t("device.quality.scoreValue", { score: report.score })}
              </p>
              <Badge variant={report.score >= 70 ? "secondary" : "destructive"}>
                {t(`device.quality.band.${qualityBand(report.score)}`)}
              </Badge>
            </div>
            {report.findings.length === 0 ? (
              <p className="text-sm">{t("device.quality.clean")}</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {report.findings.map((finding) => (
                  <li key={finding.code} className="flex flex-wrap items-start gap-2">
                    <Badge variant={BADGE[finding.severity]}>
                      {t(`device.quality.severity.${finding.severity}`)}
                    </Badge>
                    <span className="min-w-0 flex-1">{describe(finding)}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
