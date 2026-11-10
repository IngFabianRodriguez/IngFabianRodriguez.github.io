import { useMemo, useState, type ChangeEvent } from "react";
import { useAppActions, useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { summarizeLoaded } from "@/domain/import/activitySummary";
import { decodeRideFile } from "@/domain/import/decode";
import { RideImportError } from "@/domain/import/errors";
import {
  activityKey,
  activityStatus,
  duplicateKeys,
  fileKey,
  type ActivityStatus,
} from "@/domain/import/duplicates";
import { NoUsableRecordsError } from "@/domain/ride";
import {
  filesFromHandle,
  filesFromInput,
  getDirectoryPicker,
  scanFolder,
  type FolderActivity,
  type FolderFile,
  type FolderScan,
} from "@/features/library/folderScan";
import { formatDateTime } from "@/features/library/format";
import { useStoreSnapshot } from "@/features/library/useStoreSnapshot";
import { yieldToPaint } from "@/features/library/yieldToPaint";
import { FitReadError } from "@/fit/readFit";
import { rememberSource } from "@/lib/persistence/sources";
import { formatDistance, formatDuration } from "@/lib/units";

interface Row {
  activity: FolderActivity;
  status: ActivityStatus;
  duplicateInFolder: boolean;
}

/** `webkitdirectory` is not in React's types; it makes a file input hand over a whole folder. */
const FOLDER_INPUT = { webkitdirectory: "" } as Record<string, string>;

const STATUS_VARIANT = {
  new: "default",
  loaded: "secondary",
  processed: "secondary",
  unlisted: "outline",
} as const;

export function DeviceFolder() {
  const { t, locale } = useI18n();
  const { rides, units } = useAppState();
  const { addRide } = useAppActions();
  const { processed } = useStoreSnapshot();
  const [scan, setScan] = useState<FolderScan | null>(null);
  const [scanning, setScanning] = useState<{ done: number; total: number } | null>(null);
  const [folderError, setFolderError] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<{ name: string; current: number; total: number } | null>(
    null,
  );
  const [failures, setFailures] = useState<{ name: string; message: string }[]>([]);
  const picker = getDirectoryPicker();

  const rows = useMemo<Row[]>(() => {
    if (!scan) return [];
    const loaded = new Set(rides.map((r) => activityKey(summarizeLoaded(r.fit, r.ride))));
    const known = {
      loaded,
      processed: new Set(processed.map((p) => p.key)),
      processedFiles: new Set(processed.map((p) => fileKey(p.fileName, p.sizeBytes))),
    };
    const repeated = duplicateKeys(scan.activities.map((a) => a.key));
    return scan.activities.map((activity) => ({
      activity,
      status: activityStatus(
        { name: activity.file.file.name, sizeBytes: activity.file.file.size, key: activity.key },
        known,
        scan.hasList ? activity.listEntry !== null : true,
      ),
      duplicateInFolder: repeated.has(activity.key),
    }));
  }, [scan, rides, processed]);

  async function runScan(files: FolderFile[]) {
    setFolderError(false);
    setFailures([]);
    setSelected(new Set());
    setScanning({ done: 0, total: files.length });
    try {
      setScan(await scanFolder(files, (done, total) => setScanning({ done, total })));
    } catch {
      setFolderError(true);
    } finally {
      setScanning(null);
    }
  }

  async function chooseFolder() {
    if (!picker) return;
    try {
      // Read only: the folder is listed and read, never written to.
      await runScan(await filesFromHandle(await picker({ mode: "read" })));
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) setFolderError(true);
    }
  }

  function chooseFromInput(event: ChangeEvent<HTMLInputElement>) {
    const files = filesFromInput(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0) void runScan(files);
  }

  function toggle(path: string, on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(path);
      else next.delete(path);
      return next;
    });
  }

  const chosen = rows.filter((row) => selected.has(row.activity.file.path));
  const warned = chosen.filter(
    (row) => row.status === "loaded" || row.status === "processed" || row.duplicateInFolder,
  ).length;

  async function loadSelected() {
    const queue = chosen.map((row) => row.activity.file.file).reverse();
    const failed: { name: string; message: string }[] = [];
    setFailures([]);
    for (const [index, file] of queue.entries()) {
      setLoading({ name: file.name, current: index + 1, total: queue.length });
      await yieldToPaint();
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const decoded = decodeRideFile(file.name, bytes);
        rememberSource(decoded.fit, bytes);
        addRide({
          fileName: file.name,
          source: decoded.source,
          fit: decoded.fit,
          ride: decoded.ride,
        });
      } catch (caught) {
        const message =
          caught instanceof RideImportError
            ? t(`library.import.error.${caught.code}`)
            : caught instanceof FitReadError || caught instanceof NoUsableRecordsError
              ? caught.message
              : t("library.picker.errorGeneric");
        failed.push({ name: file.name, message });
      }
    }
    setLoading(null);
    setFailures(failed);
    setSelected(new Set());
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("library.device.title")}</h2>
        </CardTitle>
        <CardDescription>{t("library.device.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {picker ? (
          <div>
            <Button onClick={() => void chooseFolder()} disabled={scanning !== null}>
              {t("library.device.choose")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor="device-folder">{t("library.device.chooseFallback")}</Label>
            <Input
              id="device-folder"
              type="file"
              multiple
              {...FOLDER_INPUT}
              onChange={chooseFromInput}
            />
          </div>
        )}

        {scanning ? (
          <div role="status" className="grid gap-1">
            <Progress
              value={scanning.total === 0 ? 0 : (scanning.done / scanning.total) * 100}
              aria-valuenow={
                scanning.total === 0 ? 0 : Math.round((scanning.done / scanning.total) * 100)
              }
              aria-label={t("library.device.scanning")}
            />
            <p className="text-muted-foreground text-sm">
              {t("library.device.scanningStatus", { done: scanning.done, total: scanning.total })}
            </p>
          </div>
        ) : null}

        {folderError ? (
          <Alert variant="destructive">
            <AlertDescription>{t("library.device.error")}</AlertDescription>
          </Alert>
        ) : null}

        {scan && !scanning ? (
          <>
            <div className="text-sm">
              <p>{t("library.device.found", { count: scan.activities.length })}</p>
              <p className="text-muted-foreground">
                {scan.hasList
                  ? t("library.device.hasList", {
                      count: scan.activities.filter((a) => a.listEntry).length,
                    })
                  : t("library.device.noList")}
              </p>
              {scan.skipped > 0 ? (
                <p className="text-muted-foreground">
                  {t("library.device.skipped", { count: scan.skipped })}
                </p>
              ) : null}
            </div>

            {rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("library.device.empty")}</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setSelected(
                        new Set(
                          rows.filter((r) => r.status === "new").map((r) => r.activity.file.path),
                        ),
                      )
                    }
                  >
                    {t("library.device.selectNew")}
                  </Button>
                  <Button variant="outline" onClick={() => setSelected(new Set())}>
                    {t("library.device.clear")}
                  </Button>
                  <Button
                    onClick={() => void loadSelected()}
                    disabled={chosen.length === 0 || loading !== null}
                  >
                    {t("library.device.load", { count: chosen.length })}
                  </Button>
                </div>

                {warned > 0 ? (
                  <Alert>
                    <AlertDescription>
                      {t("library.device.warnDuplicates", { count: warned })}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {loading ? (
                  <div role="status" className="grid gap-1">
                    <Progress
                      value={((loading.current - 1) / loading.total) * 100}
                      aria-valuenow={Math.round(((loading.current - 1) / loading.total) * 100)}
                      aria-label={t("library.device.loading")}
                    />
                    <p className="text-muted-foreground text-sm">
                      {t("library.device.loadingStatus", {
                        name: loading.name,
                        current: loading.current,
                        total: loading.total,
                      })}
                    </p>
                  </div>
                ) : null}

                {failures.length > 0 ? (
                  <Alert variant="destructive">
                    <AlertTitle>{t("library.device.loadError")}</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4">
                        {failures.map((f, i) => (
                          <li key={`${f.name}-${i}`}>
                            {t("library.picker.errorItem", { name: f.name, message: f.message })}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                ) : null}

                <Table>
                  <TableCaption>{t("library.device.caption")}</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">{t("library.device.col.select")}</TableHead>
                      <TableHead scope="col">{t("library.device.col.date")}</TableHead>
                      <TableHead scope="col">{t("library.device.col.distance")}</TableHead>
                      <TableHead scope="col">{t("library.device.col.duration")}</TableHead>
                      <TableHead scope="col">{t("library.device.col.status")}</TableHead>
                      <TableHead scope="col">{t("library.device.col.file")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(({ activity, status, duplicateInFolder }) => {
                      const name = activity.file.file.name;
                      const path = activity.file.path;
                      return (
                        <TableRow
                          key={path}
                          data-state={selected.has(path) ? "selected" : undefined}
                        >
                          <TableCell>
                            <Checkbox
                              aria-label={t("library.device.selectRow", { name })}
                              checked={selected.has(path)}
                              onCheckedChange={(on) => toggle(path, on === true)}
                            />
                          </TableCell>
                          <TableCell>
                            {formatDateTime(activity.summary.startTime.getTime(), locale)}
                          </TableCell>
                          <TableCell>
                            {formatDistance(activity.summary.distanceM / 1000, units, 1)}
                          </TableCell>
                          <TableCell>{formatDuration(activity.summary.durationS)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant={STATUS_VARIANT[status]}>
                                {t(`library.device.status.${status}`)}
                              </Badge>
                              {duplicateInFolder ? (
                                <Badge variant="destructive">
                                  {t("library.device.status.duplicate")}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="break-all">{name}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
