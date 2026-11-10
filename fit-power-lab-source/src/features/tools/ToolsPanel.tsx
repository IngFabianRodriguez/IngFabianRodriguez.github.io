import { useActiveRide, useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { AltitudeGpsCard } from "@/features/tools/AltitudeGpsCard";
import { MergeCard } from "@/features/tools/MergeCard";
import { TrimCard } from "@/features/tools/TrimCard";

/**
 * Tools that work on the loaded rides and make a new ride each time (the original is never
 * changed); the new ride is added to the loaded rides and can be exported like any other.
 */
export function ToolsPanel() {
  const { t } = useI18n();
  const { rides } = useAppState();
  const active = useActiveRide();

  return (
    <div className="grid gap-4">
      {rides.length === 0 || !active ? (
        <p className="text-muted-foreground text-sm">{t("tools.noRide")}</p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <TrimCard />
        <MergeCard />
        <AltitudeGpsCard />
      </div>
    </div>
  );
}
