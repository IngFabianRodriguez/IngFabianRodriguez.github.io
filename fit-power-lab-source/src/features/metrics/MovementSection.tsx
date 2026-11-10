import { useI18n } from "@/app/I18nContext";
import { MIN_STOP_S, MOVING_SPEED_MS, type MovementSummary } from "@/domain/metrics/movement";
import { Stat, StatGrid } from "@/features/metrics/Stat";
import { formatDuration } from "@/lib/units";

export function MovementSection({ movement }: { movement: MovementSummary }) {
  const { t } = useI18n();

  return (
    <>
      <StatGrid>
        <Stat label={t("metrics.stat.total")} value={formatDuration(movement.totalS)} />
        <Stat label={t("metrics.stat.moving")} value={formatDuration(movement.movingS)} />
        <Stat label={t("metrics.stat.stopped")} value={formatDuration(movement.stoppedS)} />
        <Stat label={t("metrics.stat.stops")} value={String(movement.stops)} />
      </StatGrid>
      <p className="text-muted-foreground text-xs">
        {t("metrics.movement.rule", { speed: MOVING_SPEED_MS, seconds: MIN_STOP_S })}
      </p>
    </>
  );
}
