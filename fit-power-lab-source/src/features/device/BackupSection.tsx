import { useI18n } from "@/app/I18nContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type BackupResult =
  | { kind: "zip"; count: number }
  | { kind: "folder"; copied: number; skipped: number; conflicts: number; failed: number }
  | { kind: "error"; code: "targetIsDevice" | "failed" };

export interface BackupSectionProps {
  hasDevice: boolean;
  /** The activities are still being read to find out which are already backed up. */
  checking: boolean;
  total: number;
  pending: number;
  onlyNew: boolean;
  canPickFolder: boolean;
  progress: { done: number; total: number } | null;
  result: BackupResult | null;
  onOnlyNewChange: (onlyNew: boolean) => void;
  onZip: () => void;
  onFolder: () => void;
}

export function BackupSection(props: BackupSectionProps) {
  const { t } = useI18n();
  const toCopy = props.onlyNew ? props.pending : props.total;
  const idle = props.hasDevice && !props.checking && props.progress === null;
  const disabled = !idle || toCopy === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("device.backup.title")}</CardTitle>
        <CardDescription>{t("device.backup.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!props.hasDevice ? (
          <p className="text-muted-foreground text-sm">{t("device.backup.noDevice")}</p>
        ) : props.checking ? (
          <p className="text-muted-foreground text-sm">{t("device.backup.checking")}</p>
        ) : (
          <p className="text-sm">
            {t("device.backup.summary", { total: props.total, pending: props.pending })}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Checkbox
            id="device-backup-only-new"
            checked={props.onlyNew}
            onCheckedChange={(checked) => props.onOnlyNewChange(checked === true)}
          />
          <Label htmlFor="device-backup-only-new">{t("device.backup.onlyNew")}</Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={props.onZip} disabled={disabled}>
            {t("device.backup.zip")}
          </Button>
          {props.canPickFolder ? (
            <Button type="button" variant="outline" onClick={props.onFolder} disabled={disabled}>
              {t("device.backup.folder")}
            </Button>
          ) : null}
        </div>
        {props.canPickFolder ? (
          <p className="text-muted-foreground text-sm">{t("device.backup.folderHint")}</p>
        ) : null}
        {idle && toCopy === 0 && props.total > 0 ? (
          <p className="text-sm">{t("device.backup.nothingNew")}</p>
        ) : null}
        <div role="status" className="text-sm">
          {props.progress
            ? t("device.backup.progress", {
                done: props.progress.done,
                total: props.progress.total,
              })
            : null}
        </div>
        {props.result ? <BackupResultMessage result={props.result} /> : null}
      </CardContent>
    </Card>
  );
}

function BackupResultMessage({ result }: { result: BackupResult }) {
  const { t } = useI18n();
  if (result.kind === "error") {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t(`device.backup.error.${result.code}`)}</AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert>
      <AlertDescription>
        {result.kind === "zip"
          ? t("device.backup.result.zip", { count: result.count })
          : t("device.backup.result.folder", {
              copied: result.copied,
              skipped: result.skipped,
              conflicts: result.conflicts,
              failed: result.failed,
            })}
      </AlertDescription>
    </Alert>
  );
}
