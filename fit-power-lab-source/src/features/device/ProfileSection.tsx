import { useState } from "react";
import { useI18n } from "@/app/I18nContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PROFILE_LIMITS,
  type ProfileChanges,
  type ProfileField,
  type UserProfile,
} from "@/domain/device/userFit";
import type { Weights } from "@/domain/weights";
import { initialInputs, readInputs, type ProfileInputs } from "@/features/device/profileForm";
import { formatWeight, weightUnit, type UnitSystem } from "@/lib/units";

export type ProfileMessage =
  "applied" | "outOfRange" | "downloaded" | "invalid" | "missing" | "noWeights";

export interface ProfileSectionProps {
  /** Null when the device folder has no readable user.fit. */
  profile: UserProfile | null;
  /** user.fit exists but could not be read. */
  unreadable: boolean;
  /** A device folder was chosen, so a missing user.fit is news rather than the starting state. */
  folderChosen: boolean;
  units: UnitSystem;
  weights: Weights | null;
  message: ProfileMessage | null;
  onUseDeviceWeights: () => void;
  onDownloadEdited: (changes: ProfileChanges) => void;
  onDownloadAppWeights: () => void;
}

const FIELDS: { field: ProfileField; input: keyof ProfileInputs }[] = [
  { field: "riderKg", input: "rider" },
  { field: "bikeKg", input: "bike" },
  { field: "age", input: "age" },
  { field: "heightM", input: "heightCm" },
];

/** The editor starts from the device values and resets when the parent changes its `key`. */
export function ProfileSection(props: ProfileSectionProps) {
  const { t } = useI18n();
  const { profile, units } = props;
  const [inputs, setInputs] = useState<ProfileInputs>(() =>
    profile ? initialInputs(profile, units) : { rider: "", bike: "", age: "", heightCm: "" },
  );

  function show(field: ProfileField, value: number | undefined): string {
    if (value === undefined) return t("device.profile.unknown");
    if (field === "riderKg" || field === "bikeKg") return formatWeight(value, units);
    if (field === "heightM") return `${Math.round(value * 100)} cm`;
    return t("device.profile.years", { count: value });
  }

  function range(field: ProfileField): string {
    const { min, max } = PROFILE_LIMITS[field];
    if (field === "riderKg" || field === "bikeKg") {
      return `${formatWeight(min, units, 0)} - ${formatWeight(max, units, 0)}`;
    }
    if (field === "heightM") return `${min * 100} - ${max * 100} cm`;
    return `${min} - ${max}`;
  }

  const label = (field: ProfileField, input: keyof ProfileInputs) =>
    input === "rider" || input === "bike"
      ? t(`device.profile.field.${field}`, { unit: weightUnit(units) })
      : t(`device.profile.field.${field}`);

  const parsed = profile ? readInputs(inputs, profile, units) : null;
  const changed = parsed ? FIELDS.filter(({ field }) => parsed.changes[field] !== undefined) : [];
  const canDownload =
    parsed !== null && changed.length > 0 && Object.keys(parsed.errors).length === 0;
  const deviceWeights =
    profile?.riderKg !== undefined && profile.bikeKg !== undefined
      ? { riderKg: profile.riderKg, bikeKg: profile.bikeKg }
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("device.profile.title")}</CardTitle>
        <CardDescription>{t("device.profile.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {props.unreadable ? (
          <Alert variant="destructive">
            <AlertDescription>{t("device.profile.unreadable")}</AlertDescription>
          </Alert>
        ) : null}
        {profile === null ? (
          <p className="text-muted-foreground text-sm">
            {t(props.folderChosen ? "device.profile.noFile" : "device.profile.noFolder")}
          </p>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map(({ field, input }) => {
                const problem = parsed?.errors[field];
                const errorId = `device-profile-${input}-error`;
                return (
                  <div key={field} className="grid gap-2">
                    <Label htmlFor={`device-profile-${input}`}>{label(field, input)}</Label>
                    <Input
                      id={`device-profile-${input}`}
                      inputMode="decimal"
                      value={inputs[input]}
                      aria-invalid={problem !== undefined}
                      aria-describedby={problem ? errorId : undefined}
                      onChange={(event) => setInputs({ ...inputs, [input]: event.target.value })}
                    />
                    {problem ? (
                      <p id={errorId} className="text-destructive text-sm">
                        {t(`device.profile.error.${problem}`, { range: range(field) })}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <Table>
              <TableCaption>{t("device.profile.changesCaption")}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("device.profile.column.field")}</TableHead>
                  <TableHead>{t("device.profile.column.before")}</TableHead>
                  <TableHead>{t("device.profile.column.after")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>{t("device.profile.noChanges")}</TableCell>
                  </TableRow>
                ) : (
                  changed.map(({ field }) => (
                    <TableRow key={field}>
                      <TableCell>{t(`device.profile.name.${field}`)}</TableCell>
                      <TableCell>{show(field, profile[field])}</TableCell>
                      <TableCell>{show(field, parsed?.changes[field])}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div>
              <Button
                type="button"
                disabled={!canDownload}
                onClick={() => parsed && props.onDownloadEdited(parsed.changes)}
              >
                {t("device.profile.download")}
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">{t("device.profile.instructions")}</p>
          </div>
        )}

        <div className="grid gap-3 border-t pt-4">
          <p className="text-sm font-medium">{t("device.profile.sync.title")}</p>
          <p className="text-sm">
            {props.weights
              ? t("device.profile.sync.app", {
                  rider: formatWeight(props.weights.riderKg, units),
                  bike: formatWeight(props.weights.bikeKg, units),
                })
              : t("device.profile.sync.noApp")}
          </p>
          <p className="text-sm">
            {deviceWeights
              ? t("device.profile.sync.device", {
                  rider: formatWeight(deviceWeights.riderKg, units),
                  bike: formatWeight(deviceWeights.bikeKg, units),
                })
              : t("device.profile.sync.noDevice")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={deviceWeights === null}
              onClick={props.onUseDeviceWeights}
            >
              {t("device.profile.sync.useDevice")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={profile === null || props.weights === null}
              onClick={props.onDownloadAppWeights}
            >
              {t("device.profile.sync.downloadApp")}
            </Button>
          </div>
        </div>

        <div role="status">
          {props.message ? (
            <Alert variant={isProblem(props.message) ? "destructive" : "default"}>
              <AlertDescription>{t(`device.profile.message.${props.message}`)}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

const isProblem = (message: ProfileMessage) =>
  message === "outOfRange" || message === "invalid" || message === "missing";
