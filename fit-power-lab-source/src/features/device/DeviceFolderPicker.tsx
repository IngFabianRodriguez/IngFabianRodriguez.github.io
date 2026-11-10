import type { ChangeEvent } from "react";
import { useI18n } from "@/app/I18nContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FolderProblem = "blocked" | "unreadable" | "empty";

export interface DeviceFolderPickerProps {
  canPick: boolean;
  loading: boolean;
  folderName: string | null;
  problem: FolderProblem | null;
  onPick: () => void;
  onFiles: (files: File[]) => void;
}

// Not in React's typings: makes the file field choose a whole folder.
const folderAttributes = { webkitdirectory: "" } as Record<string, string>;

/** Chooses the device folder: the folder picker where the browser has one, a folder field always. */
export function DeviceFolderPicker(props: DeviceFolderPickerProps) {
  const { t } = useI18n();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) props.onFiles(files);
    event.target.value = "";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("device.folder.title")}</CardTitle>
        <CardDescription>{t("device.folder.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {props.canPick ? (
          <div>
            <Button type="button" onClick={props.onPick} disabled={props.loading}>
              {t("device.folder.pick")}
            </Button>
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="device-folder-input">{t("device.folder.input")}</Label>
          <Input
            id="device-folder-input"
            type="file"
            multiple
            onChange={handleChange}
            disabled={props.loading}
            {...folderAttributes}
          />
        </div>
        <p role="status" className="text-muted-foreground text-sm">
          {props.loading
            ? t("device.folder.loading")
            : props.folderName
              ? t("device.folder.loaded", { name: props.folderName })
              : ""}
        </p>
        {props.problem ? (
          <Alert variant="destructive">
            <AlertDescription>{t(`device.folder.${props.problem}`)}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
