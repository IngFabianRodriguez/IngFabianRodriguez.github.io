import { useI18n } from "@/app/I18nContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeviceInfo } from "@/domain/device/deviceBin";

export interface DeviceInfoCardProps {
  /** Null when no device folder was chosen or its Device.bin is missing or unreadable. */
  info: DeviceInfo | null;
  folderChosen: boolean;
}

const ROWS: { key: keyof DeviceInfo; label: string }[] = [
  { key: "model", label: "device.info.model" },
  { key: "brand", label: "device.info.brand" },
  { key: "hardware", label: "device.info.hardware" },
  { key: "firmware", label: "device.info.firmware" },
  { key: "serial", label: "device.info.serial" },
];

export function DeviceInfoCard({ info, folderChosen }: DeviceInfoCardProps) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("device.info.title")}</CardTitle>
        <CardDescription>{t("device.info.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {info ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {ROWS.filter((row) => info[row.key] !== undefined).map((row) => (
              <div key={row.key} className="contents">
                <dt className="text-muted-foreground">{t(row.label)}</dt>
                <dd className="font-medium break-all">{info[row.key]}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">
            {t(folderChosen ? "device.info.missing" : "device.info.none")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
