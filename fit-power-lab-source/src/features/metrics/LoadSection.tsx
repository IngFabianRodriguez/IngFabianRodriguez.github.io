import { useI18n } from "@/app/I18nContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DailyLoad, WeeklyLoad } from "@/domain/metrics/trainingLoad";
import { formatNumber } from "@/features/metrics/format";
import { MetricLineChart } from "@/features/metrics/MetricLineChart";
import { Stat, StatGrid } from "@/features/metrics/Stat";

interface LoadSectionProps {
  /** False when there is no FTP, so no TSS can be computed. */
  hasFtp: boolean;
  daily: DailyLoad[];
  weekly: WeeklyLoad[];
}

const round1 = (value: number) => Math.round(value * 10) / 10;

export function LoadSection({ hasFtp, daily, weekly }: LoadSectionProps) {
  const { t, locale } = useI18n();
  const n = (value: number) => formatNumber(value, locale, 1);

  if (!hasFtp) {
    return <p className="text-muted-foreground text-sm">{t("metrics.load.needsFtp")}</p>;
  }
  const first = daily[0];
  const last = daily.at(-1);
  if (!first || !last || daily.length < 2) {
    return <p className="text-muted-foreground text-sm">{t("metrics.load.needsDays")}</p>;
  }

  const data = daily.map((d) => ({
    date: d.date,
    ctl: round1(d.ctl),
    atl: round1(d.atl),
    tsb: round1(d.tsb),
  }));

  return (
    <>
      <StatGrid>
        <Stat label={t("metrics.stat.ctl")} value={n(last.ctl)} hint={t("metrics.hint.ctl")} />
        <Stat label={t("metrics.stat.atl")} value={n(last.atl)} hint={t("metrics.hint.atl")} />
        <Stat label={t("metrics.stat.tsb")} value={n(last.tsb)} hint={t("metrics.hint.tsb")} />
      </StatGrid>
      <MetricLineChart
        data={data}
        xKey="date"
        series={[
          { key: "ctl", label: t("metrics.load.ctl"), color: "#2563eb" },
          { key: "atl", label: t("metrics.load.atl"), color: "#dc2626" },
          { key: "tsb", label: t("metrics.load.tsb"), color: "#16a34a" },
        ]}
        ariaLabel={t("metrics.load.chart", {
          from: first.date,
          to: last.date,
          ctl: n(last.ctl),
          atl: n(last.atl),
          tsb: n(last.tsb),
        })}
      />
      <Table aria-label={t("metrics.load.weekly")}>
        <TableHeader>
          <TableRow>
            <TableHead>{t("metrics.load.week")}</TableHead>
            <TableHead>TSS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {weekly.map((week) => (
            <TableRow key={week.weekStart}>
              <TableCell>{week.weekStart}</TableCell>
              <TableCell>{formatNumber(week.tss, locale, 0)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
