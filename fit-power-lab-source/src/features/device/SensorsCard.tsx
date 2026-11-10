import { useI18n } from "@/app/I18nContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cadencePaired, sensorStatus, type SensorStatus } from "@/domain/device/sensors";
import type { UserProfile } from "@/domain/device/userFit";
import type { RecordedSensors } from "@/domain/quality/assessQuality";

export interface SensorsCardProps {
  /** Null when no user.fit was read. */
  sensors: UserProfile["sensors"] | null;
  /** Null when no ride is loaded. */
  recorded: RecordedSensors | null;
}

const WARN: SensorStatus[] = ["paired-no-data", "no-data"];

export function SensorsCard({ sensors, recorded }: SensorsCardProps) {
  const { t } = useI18n();
  const known = sensors ?? {};

  const rows: { label: string; status: SensorStatus }[] = [
    {
      label: "device.sensor.heartRate",
      status: sensorStatus(known.heartRate, recorded ? recorded.heartRate : undefined),
    },
    {
      label: "device.sensor.cadence",
      status: sensorStatus(cadencePaired(known), recorded ? recorded.cadence : undefined),
    },
    { label: "device.sensor.speed", status: sensorStatus(known.speed, undefined) },
    { label: "device.sensor.speedCadence", status: sensorStatus(known.speedCadence, undefined) },
    { label: "device.sensor.power", status: sensorStatus(known.power, undefined) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("device.sensors.title")}</CardTitle>
        <CardDescription>{t("device.sensors.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ul className="grid gap-2 text-sm">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3">
              <span>{t(row.label)}</span>
              <Badge variant={WARN.includes(row.status) ? "destructive" : "secondary"}>
                {t(`device.sensorStatus.${row.status}`)}
              </Badge>
            </li>
          ))}
        </ul>
        {sensors === null ? (
          <p className="text-muted-foreground text-sm">{t("device.sensors.noProfile")}</p>
        ) : null}
        {recorded === null ? (
          <p className="text-muted-foreground text-sm">{t("device.sensors.noRide")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
