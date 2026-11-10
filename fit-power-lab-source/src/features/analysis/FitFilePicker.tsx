import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useI18n } from "@/app/I18nContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { analyze, type Analysis } from "@/domain/analysis";
import { decodeRideFile, detectFormat, type ImportSource } from "@/domain/import/decode";
import { RideImportError } from "@/domain/import/errors";
import { DEFAULT_MODEL_SETTINGS } from "@/domain/modelSettings";
import { analyzeLoaded } from "@/domain/analysis";
import { NoUsableRecordsError } from "@/domain/ride";
import type { Weights } from "@/domain/weights";
import { FitReadError } from "@/fit/readFit";
import { yieldToPaint } from "@/features/library/yieldToPaint";
import { cn } from "@/lib/utils";
import { rememberSource } from "@/lib/persistence/sources";

interface FitFilePickerProps {
  weights: Weights;
  /** Called once for every file that could be analyzed; `source` says which format it was. */
  onAnalyzed: (analysis: Analysis, fileName: string, source: ImportSource) => void;
}

interface Failure {
  name: string;
  message: string;
}

interface BatchProgress {
  name: string;
  /** 1-based position of the file being analyzed. */
  current: number;
  total: number;
  /** Share of the whole batch that is done, 0 to 100. */
  percent: number;
}

/** Of each file's share of the bar: reading is done at this point, then analyzing takes the rest. */
const READ_SHARE = 0.4;

function analyzeBytes(
  name: string,
  bytes: Uint8Array,
  weights: Weights,
): { analysis: Analysis; source: ImportSource } {
  if (detectFormat(name, bytes) === "fit")
    return { analysis: analyze(bytes, weights), source: "fit" };

  const decoded = decodeRideFile(name, bytes);
  const analysis = analyzeLoaded(decoded, weights, DEFAULT_MODEL_SETTINGS);
  return { analysis, source: decoded.source };
}

const hasFiles = (event: DragEvent) =>
  Array.from(event.dataTransfer?.types ?? []).includes("Files");

export function FitFilePicker({ weights, onAnalyzed }: FitFilePickerProps) {
  const { t } = useI18n();
  const [failures, setFailures] = useState<Failure[]>([]);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [dragging, setDragging] = useState(false);
  const busy = useRef(false);

  function explain(error: unknown): string {
    if (error instanceof RideImportError) return t(`library.import.error.${error.code}`);
    if (error instanceof FitReadError || error instanceof NoUsableRecordsError)
      return error.message;
    return t("library.picker.errorGeneric");
  }

  async function analyzeFiles(files: File[]) {
    if (files.length === 0 || busy.current) return;
    busy.current = true;
    setFailures([]);

    const failed: Failure[] = [];
    const total = files.length;
    const report = (index: number, name: string, fraction: number) =>
      setProgress({ name, current: index + 1, total, percent: ((index + fraction) / total) * 100 });

    try {
      for (const [index, file] of files.entries()) {
        report(index, file.name, 0);
        await yieldToPaint();
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          report(index, file.name, READ_SHARE);
          await yieldToPaint();
          const { analysis, source } = analyzeBytes(file.name, bytes, weights);
          rememberSource(analysis.fit, bytes);
          onAnalyzed(analysis, file.name, source);
        } catch (caught) {
          failed.push({ name: file.name, message: explain(caught) });
        }
        report(index, file.name, 1);
      }
    } finally {
      busy.current = false;
      setProgress(null);
      setFailures(failed);
    }
  }

  // The window listeners must always call the latest `analyzeFiles` (it closes over the weights).
  const latest = useRef(analyzeFiles);
  useEffect(() => {
    latest.current = analyzeFiles;
  });

  useEffect(() => {
    let depth = 0;
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth += 1;
      setDragging(true);
    };
    const onOver = (event: DragEvent) => {
      // Without this the browser would open the file instead of handing it to the page.
      if (hasFiles(event)) event.preventDefault();
    };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      void latest.current(Array.from(event.dataTransfer?.files ?? []));
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const files = Array.from(input.files ?? []);
    // Choosing the same file again must fire a change again.
    input.value = "";
    void analyzeFiles(files);
  }

  return (
    <div
      className={cn(
        "grid gap-3 rounded-lg border border-dashed p-4 transition-colors",
        dragging && "border-primary bg-accent",
      )}
    >
      <p className="text-muted-foreground text-sm">
        {dragging ? t("library.picker.dropActive") : t("library.picker.dropIdle")}
      </p>
      <div className="grid gap-2">
        <Label htmlFor="fit-file">{t("library.picker.label")}</Label>
        <Input
          id="fit-file"
          type="file"
          accept=".fit,.gpx,.tcx"
          multiple
          aria-describedby="fit-file-hint"
          onChange={handleChange}
        />
        <p id="fit-file-hint" className="text-muted-foreground text-sm">
          {t("library.picker.hint")}
        </p>
      </div>
      {progress ? (
        <div role="status" className="grid gap-1">
          {/* The generated Progress does not hand `value` to its root, so the value is stated here. */}
          <Progress
            value={progress.percent}
            aria-valuenow={Math.round(progress.percent)}
            aria-label={t("library.picker.progress")}
          />
          <p className="text-muted-foreground text-sm">
            {t("library.picker.progressStatus", {
              name: progress.name,
              current: progress.current,
              total: progress.total,
            })}
          </p>
        </div>
      ) : null}
      {failures.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>{t("library.picker.errorTitle")}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {failures.map((failure, index) => (
                <li key={`${failure.name}-${index}`}>
                  {t("library.picker.errorItem", { name: failure.name, message: failure.message })}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
