import { useMemo, useState } from "react";
import { useActiveRide, useAnalyses, useAnalysis, useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Accordion } from "@/components/ui/accordion";
import type { Analysis } from "@/domain/analysis";
import { distinctRides } from "@/domain/metrics/distinctRides";
import { personalRecords } from "@/domain/metrics/records";
import {
  computeRideMetrics,
  defaultFtp,
  defaultMaxHeartRate,
  rideStress,
} from "@/domain/metrics/rideMetrics";
import { deviceSessionTotals } from "@/domain/metrics/session";
import { trainingLoad, weeklyTss, type RideLoad } from "@/domain/metrics/trainingLoad";
import { sliceRide } from "@/domain/slice";
import { CadenceSection } from "@/features/metrics/CadenceSection";
import { CurveSection } from "@/features/metrics/CurveSection";
import { LapsSection } from "@/features/metrics/LapsSection";
import { LoadSection } from "@/features/metrics/LoadSection";
import {
  loadMetricsSettings,
  saveMetricsSettings,
  type MetricsSettings,
} from "@/features/metrics/metricsStorage";
import { MetricsSection } from "@/features/metrics/MetricsSection";
import { MovementSection } from "@/features/metrics/MovementSection";
import { PowerSection } from "@/features/metrics/PowerSection";
import { RecordsSection } from "@/features/metrics/RecordsSection";
import { ReferenceValues } from "@/features/metrics/ReferenceValues";
import { TerrainSection } from "@/features/metrics/TerrainSection";
import { ZonesSection } from "@/features/metrics/ZonesSection";
import { formatDistance } from "@/lib/units";

const MILE_M = 1609.344;

interface MetricsContentProps {
  analysis: Analysis;
  riderKg: number;
}

/** Everything the panel shows once there is a ride and confirmed weights. */
function MetricsContent({ analysis, riderKg }: MetricsContentProps) {
  const { t } = useI18n();
  const { units, range } = useAppState();
  const everyRide = useAnalyses();
  const [settings, setSettings] = useState<MetricsSettings>(loadMetricsSettings);
  const [initialSettings] = useState(settings);

  function change(patch: Partial<MetricsSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveMetricsSettings(next);
  }

  // The defaults come from the whole ride, so the zones do not move when a stretch is selected.
  const estimatedFtp = useMemo(() => defaultFtp(analysis.ride, analysis.watts), [analysis]);
  const seenMaxHeartRate = useMemo(() => defaultMaxHeartRate(analysis.ride), [analysis]);
  const ftp = settings.ftp ?? estimatedFtp;
  const maxHeartRate = settings.maxHeartRate ?? seenMaxHeartRate;
  const lapLengthM = units === "imperial" ? MILE_M : 1000;

  const stretch = useMemo(() => sliceRide(analysis.ride, analysis.watts, range), [analysis, range]);
  const metrics = useMemo(
    () =>
      computeRideMetrics({
        ride: stretch.ride,
        watts: stretch.watts,
        riderKg,
        ftp,
        maxHeartRate,
        lapLengthM,
      }),
    [stretch, riderKg, ftp, maxHeartRate, lapLengthM],
  );
  const device = useMemo(() => deviceSessionTotals(analysis.fit), [analysis.fit]);

  // The load and the records look across every loaded ride, whatever stretch is selected.
  const rides = useMemo(() => distinctRides(everyRide, (item) => item.analysis.ride), [everyRide]);
  const load = useMemo(() => {
    if (ftp === null) return { daily: [], weekly: [] };
    const stressed: RideLoad[] = rides.flatMap(({ analysis: a }) => {
      const stress = rideStress(a.ride, a.watts, ftp);
      return stress ? [{ startTime: a.ride.startTime, tss: stress.tss }] : [];
    });
    return { daily: trainingLoad(stressed), weekly: weeklyTss(stressed) };
  }, [rides, ftp]);
  const records = useMemo(
    () =>
      personalRecords(
        rides.map(({ loaded, analysis: a }) => ({
          id: loaded.id,
          label: loaded.fileName,
          ride: a.ride,
          watts: a.watts,
        })),
      ),
    [rides],
  );

  return (
    <div className="grid gap-4">
      <h2 className="sr-only">{t("metrics.title")}</h2>
      <ReferenceValues
        initial={initialSettings}
        defaultFtp={estimatedFtp}
        defaultMaxHeartRate={seenMaxHeartRate}
        onChange={change}
      />
      {range ? (
        <p className="text-muted-foreground text-sm">
          {t("metrics.stretchNote", {
            from: formatDistance(Math.min(range.fromKm, range.toKm), units, 1),
            to: formatDistance(Math.max(range.fromKm, range.toKm), units, 1),
          })}
        </p>
      ) : null}
      <Accordion type="multiple" defaultValue={["power"]}>
        <MetricsSection value="power" title={t("metrics.section.power")}>
          <PowerSection metrics={metrics} ftp={ftp} deviceCalories={device.calories} />
        </MetricsSection>
        <MetricsSection value="curve" title={t("metrics.section.curve")}>
          <CurveSection curve={metrics.curve} ftpEstimate={metrics.ftpEstimate} />
        </MetricsSection>
        <MetricsSection value="zones" title={t("metrics.section.zones")}>
          <ZonesSection
            powerZones={metrics.powerZones}
            heartRateZones={metrics.heartRateZones}
            hasHeartRate={metrics.hasHeartRate}
          />
        </MetricsSection>
        <MetricsSection value="terrain" title={t("metrics.section.terrain")}>
          <TerrainSection
            metrics={metrics}
            deviceAscentM={device.ascentM}
            units={units}
            riderKg={riderKg}
          />
        </MetricsSection>
        <MetricsSection value="movement" title={t("metrics.section.movement")}>
          <MovementSection movement={metrics.movement} />
        </MetricsSection>
        <MetricsSection value="laps" title={t("metrics.section.laps")}>
          <LapsSection laps={metrics.laps} units={units} />
        </MetricsSection>
        <MetricsSection value="cadence" title={t("metrics.section.cadence")}>
          <CadenceSection cadence={metrics.cadence} torque={metrics.torque} />
        </MetricsSection>
        <MetricsSection value="load" title={t("metrics.section.load")}>
          <LoadSection hasFtp={ftp !== null} daily={load.daily} weekly={load.weekly} />
        </MetricsSection>
        <MetricsSection value="records" title={t("metrics.section.records")}>
          <RecordsSection records={records} units={units} rideCount={rides.length} />
        </MetricsSection>
      </Accordion>
    </div>
  );
}

/** Training metrics of the active ride (or its selected stretch) and of all the loaded rides. */
export function MetricsPanel() {
  const { t } = useI18n();
  const { weights } = useAppState();
  const active = useActiveRide();
  const analysis = useAnalysis();

  if (!active) {
    return <p className="text-muted-foreground text-sm">{t("metrics.noRide")}</p>;
  }
  if (!analysis || !weights) {
    return <p className="text-muted-foreground text-sm">{t("metrics.needWeights")}</p>;
  }
  return <MetricsContent analysis={analysis} riderKg={weights.riderKg} />;
}
