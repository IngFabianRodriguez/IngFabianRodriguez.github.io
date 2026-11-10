import { useMemo, useRef, useState } from "react";
import { useActiveRide, useAppActions, useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { parseDeviceBin } from "@/domain/device/deviceBin";
import {
  ProfileEditError,
  readUserProfile,
  writeUserProfile,
  type ProfileChanges,
  type UserProfile,
} from "@/domain/device/userFit";
import { assessQuality, recordedSensors } from "@/domain/quality/assessQuality";
import { parseWeights } from "@/domain/weights";
import { readFit, type FitFile } from "@/fit/readFit";
import { downloadFile } from "@/lib/download";
import {
  classifyActivities,
  describeActivity,
  loadBackupRecord,
  rememberBackup,
  saveBackupRecord,
  type BackupEntry,
} from "@/features/device/backupRecord";
import { BackupSection, type BackupResult } from "@/features/device/BackupSection";
import {
  backupToFolder,
  backupZipName,
  buildBackupZip,
  looksLikeDevice,
} from "@/features/device/backupWriter";
import { DeviceFolderPicker, type FolderProblem } from "@/features/device/DeviceFolderPicker";
import { DeviceInfoCard } from "@/features/device/DeviceInfoCard";
import {
  canPickDirectory,
  pickDirectory,
  readDeviceSnapshot,
  sourcesFromDirectory,
  sourcesFromFileList,
  type DeviceSnapshot,
  type DirectoryHandleLike,
  type FileSource,
} from "@/features/device/deviceFolder";
import { FreeSpaceGuide } from "@/features/device/FreeSpaceGuide";
import { ProfileSection, type ProfileMessage } from "@/features/device/ProfileSection";
import { QualityCard } from "@/features/device/QualityCard";
import { SensorsCard } from "@/features/device/SensorsCard";

const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

/** The device section: what the bike computer says, a quality check of the ride, and backups. */
export function DevicePanel() {
  const { t } = useI18n();
  const { units, weights } = useAppState();
  const { setWeights } = useAppActions();
  const activeRide = useActiveRide();

  const [snapshot, setSnapshot] = useState<DeviceSnapshot | null>(null);
  const [deviceHandle, setDeviceHandle] = useState<DirectoryHandleLike | null>(null);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<FolderProblem | null>(null);
  const [entries, setEntries] = useState<BackupEntry[] | null>(null);
  const [record, setRecord] = useState(loadBackupRecord);
  const [onlyNew, setOnlyNew] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<BackupResult | null>(null);
  const [profileMessage, setProfileMessage] = useState<ProfileMessage | null>(null);
  const loadId = useRef(0);

  const info = useMemo(
    () => (snapshot?.deviceBin != null ? parseDeviceBin(snapshot.deviceBin) : null),
    [snapshot],
  );

  const userFit = useMemo((): { fit: FitFile; profile: UserProfile } | "unreadable" | null => {
    if (!snapshot?.userFit) return null;
    try {
      const fit = readFit(snapshot.userFit);
      return { fit, profile: readUserProfile(fit) };
    } catch {
      return "unreadable";
    }
  }, [snapshot]);

  const quality = useMemo(() => (activeRide ? assessQuality(activeRide.ride) : null), [activeRide]);
  const recorded = useMemo(
    () => (activeRide ? recordedSensors(activeRide.ride) : null),
    [activeRide],
  );

  const classification = useMemo(
    () => (entries ? classifyActivities(entries, record) : null),
    [entries, record],
  );

  async function openFolder(
    folderName: string,
    sources: FileSource[],
    handle: DirectoryHandleLike | null,
  ) {
    const id = ++loadId.current;
    setLoading(true);
    setProblem(null);
    setResult(null);
    setProfileMessage(null);
    try {
      const next = await readDeviceSnapshot(folderName, sources);
      if (id !== loadId.current) return;
      setSnapshot(next);
      setDeviceHandle(handle);
      setVersion((v) => v + 1);
      setEntries(null);
      setLoading(false);
      if (!next.deviceBin && !next.userFit && next.activities.length === 0) setProblem("empty");

      const list: BackupEntry[] = [];
      for (const activity of next.activities) {
        const bytes = await activity.read();
        if (id !== loadId.current) return;
        list.push(describeActivity(activity.name, bytes));
      }
      setEntries(list);
    } catch {
      if (id !== loadId.current) return;
      setProblem("unreadable");
      setLoading(false);
    }
  }

  async function handlePick() {
    try {
      const handle = await pickDirectory("read");
      setLoading(true);
      await openFolder(handle.name, await sourcesFromDirectory(handle), handle);
    } catch (error) {
      setLoading(false);
      if (!isAbort(error)) setProblem("blocked");
    }
  }

  async function handleFiles(files: File[]) {
    const { folderName, sources } = sourcesFromFileList(files);
    await openFolder(folderName, sources, null);
  }

  function remember(backedUp: BackupEntry[]) {
    const next = rememberBackup(record, backedUp, Date.now());
    setRecord(next);
    saveBackupRecord(next);
  }

  /** The activities a backup covers: all of them, or only those not backed up yet. */
  function selection() {
    if (!snapshot || !classification) return [];
    const names = new Set((onlyNew ? classification.pending : (entries ?? [])).map((e) => e.name));
    return snapshot.activities.filter((a) => names.has(a.name));
  }

  async function handleZip() {
    setResult(null);
    setProgress({ done: 0, total: 1 });
    try {
      const { zip, entries: packed } = await buildBackupZip(selection());
      downloadFile(zip, backupZipName(new Date()));
      remember(packed);
      setResult({ kind: "zip", count: packed.length });
    } catch {
      setResult({ kind: "error", code: "failed" });
    } finally {
      setProgress(null);
    }
  }

  async function handleFolder() {
    setResult(null);
    let target: DirectoryHandleLike;
    try {
      target = await pickDirectory("readwrite");
    } catch (error) {
      if (!isAbort(error)) setResult({ kind: "error", code: "failed" });
      return;
    }
    try {
      if (await looksLikeDevice(target, deviceHandle ?? undefined)) {
        setResult({ kind: "error", code: "targetIsDevice" });
        return;
      }
      const chosen = selection();
      setProgress({ done: 0, total: chosen.length });
      const outcome = await backupToFolder(target, chosen, (done, total) =>
        setProgress({ done, total }),
      );
      remember([...outcome.copied, ...outcome.skipped]);
      setResult({
        kind: "folder",
        copied: outcome.copied.length,
        skipped: outcome.skipped.length,
        conflicts: outcome.conflicts.length,
        failed: outcome.failed.length,
      });
    } catch {
      setResult({ kind: "error", code: "failed" });
    } finally {
      setProgress(null);
    }
  }

  function downloadProfile(changes: ProfileChanges) {
    if (userFit === null || userFit === "unreadable") return;
    try {
      downloadFile(writeUserProfile(userFit.fit, changes), "user.fit");
      setProfileMessage("downloaded");
    } catch (error) {
      const missing = error instanceof ProfileEditError && error.reason === "missing-message";
      setProfileMessage(missing ? "missing" : "invalid");
    }
  }

  function useDeviceWeights() {
    if (userFit === null || userFit === "unreadable") return;
    const { riderKg, bikeKg } = userFit.profile;
    const parsed =
      riderKg !== undefined && bikeKg !== undefined
        ? parseWeights(String(riderKg), String(bikeKg))
        : null;
    if (parsed?.ok) {
      setWeights(parsed.weights);
      setProfileMessage("applied");
    } else {
      setProfileMessage("outOfRange");
    }
  }

  function downloadAppWeights() {
    if (weights === null) return setProfileMessage("noWeights");
    downloadProfile({ riderKg: weights.riderKg, bikeKg: weights.bikeKg });
  }

  const profile = userFit !== null && userFit !== "unreadable" ? userFit.profile : null;

  return (
    <div className="grid gap-6">
      <h2 className="sr-only">{t("device.title")}</h2>
      <DeviceFolderPicker
        canPick={canPickDirectory()}
        loading={loading}
        folderName={snapshot?.folderName ?? null}
        problem={problem}
        onPick={() => void handlePick()}
        onFiles={(files) => void handleFiles(files)}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <DeviceInfoCard info={info} folderChosen={snapshot !== null} />
        <SensorsCard sensors={profile ? profile.sensors : null} recorded={recorded} />
      </div>
      <QualityCard report={quality} units={units} />
      <BackupSection
        hasDevice={snapshot !== null && snapshot.activities.length > 0}
        checking={snapshot !== null && entries === null}
        total={entries?.length ?? 0}
        pending={classification?.pending.length ?? 0}
        onlyNew={onlyNew}
        canPickFolder={canPickDirectory()}
        progress={progress}
        result={result}
        onOnlyNewChange={setOnlyNew}
        onZip={() => void handleZip()}
        onFolder={() => void handleFolder()}
      />
      <FreeSpaceGuide activities={classification} />
      <ProfileSection
        key={`${version}-${units}`}
        profile={profile}
        unreadable={userFit === "unreadable"}
        folderChosen={snapshot !== null}
        units={units}
        weights={weights}
        message={profileMessage}
        onUseDeviceWeights={useDeviceWeights}
        onDownloadEdited={downloadProfile}
        onDownloadAppWeights={downloadAppWeights}
      />
    </div>
  );
}
