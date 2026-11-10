import { ComparePanel } from "@/features/library/ComparePanel";
import { DeviceFolder } from "@/features/library/DeviceFolder";
import { LoadedRides } from "@/features/library/LoadedRides";
import { RecentFiles } from "@/features/library/RecentFiles";

/**
 * The library tab: the bike computer's folder, the rides loaded in this session (to show, remove
 * and compare) and the files opened before.
 */
export function LibraryPanel() {
  return (
    <div className="grid gap-6">
      <DeviceFolder />
      <LoadedRides />
      <ComparePanel />
      <RecentFiles />
    </div>
  );
}
