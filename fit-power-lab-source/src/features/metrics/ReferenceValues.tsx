import { useState } from "react";
import { useI18n } from "@/app/I18nContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FTP_RANGE,
  HEART_RATE_RANGE,
  parseFtpInput,
  parseHeartRateInput,
  type MetricsSettings,
} from "@/features/metrics/metricsStorage";

interface ReferenceValuesProps {
  /** The values saved earlier; they fill the boxes when the panel opens. */
  initial: MetricsSettings;
  /** What is used when a box is empty: the estimate from the ride. */
  defaultFtp: number | null;
  defaultMaxHeartRate: number | null;
  /** Called with each value that parses; an empty box gives null. */
  onChange: (patch: Partial<MetricsSettings>) => void;
}

/** The rider's FTP and maximum heart rate, which the zones, IF, TSS and load are built on. */
export function ReferenceValues({
  initial,
  defaultFtp,
  defaultMaxHeartRate,
  onChange,
}: ReferenceValuesProps) {
  const { t } = useI18n();
  const [ftpText, setFtpText] = useState(initial.ftp === null ? "" : String(initial.ftp));
  const [heartRateText, setHeartRateText] = useState(
    initial.maxHeartRate === null ? "" : String(initial.maxHeartRate),
  );
  const [ftpInvalid, setFtpInvalid] = useState(false);
  const [heartRateInvalid, setHeartRateInvalid] = useState(false);

  function changeFtp(raw: string) {
    setFtpText(raw);
    const parsed = parseFtpInput(raw);
    setFtpInvalid(!parsed.ok);
    if (parsed.ok) onChange({ ftp: parsed.value });
  }

  function changeHeartRate(raw: string) {
    setHeartRateText(raw);
    const parsed = parseHeartRateInput(raw);
    setHeartRateInvalid(!parsed.ok);
    if (parsed.ok) onChange({ maxHeartRate: parsed.value });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("metrics.settings.title")}</CardTitle>
        <CardDescription>{t("metrics.settings.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="metrics-ftp">{t("metrics.ftp.label")}</Label>
          <Input
            id="metrics-ftp"
            inputMode="numeric"
            value={ftpText}
            onChange={(event) => changeFtp(event.target.value)}
            aria-invalid={ftpInvalid}
            aria-describedby="metrics-ftp-hint"
          />
          <p id="metrics-ftp-hint" className="text-muted-foreground text-xs">
            {defaultFtp === null
              ? t("metrics.ftp.noDefault")
              : t("metrics.ftp.defaultHint", { value: defaultFtp })}
          </p>
          {ftpInvalid ? (
            <p className="text-destructive text-sm">
              {t("metrics.input.invalid", { min: FTP_RANGE.min, max: FTP_RANGE.max })}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="metrics-max-hr">{t("metrics.maxHr.label")}</Label>
          <Input
            id="metrics-max-hr"
            inputMode="numeric"
            value={heartRateText}
            onChange={(event) => changeHeartRate(event.target.value)}
            aria-invalid={heartRateInvalid}
            aria-describedby="metrics-max-hr-hint"
          />
          <p id="metrics-max-hr-hint" className="text-muted-foreground text-xs">
            {defaultMaxHeartRate === null
              ? t("metrics.maxHr.noDefault")
              : t("metrics.maxHr.defaultHint", { value: defaultMaxHeartRate })}
          </p>
          {heartRateInvalid ? (
            <p className="text-destructive text-sm">
              {t("metrics.input.invalid", {
                min: HEART_RATE_RANGE.min,
                max: HEART_RATE_RANGE.max,
              })}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
