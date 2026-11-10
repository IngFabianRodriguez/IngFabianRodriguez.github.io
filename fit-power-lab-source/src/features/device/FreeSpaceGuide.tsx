import { useI18n } from "@/app/I18nContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActivityClassification } from "@/features/device/backupRecord";
import { formatBytes } from "@/features/device/format";

export interface FreeSpaceGuideProps {
  /** Null until the activities of the device have been read. */
  activities: ActivityClassification | null;
}

const STEPS = ["step1", "step2", "step3", "step4", "step5"];

/** Tells which activities of the device are already backed up. The app deletes nothing. */
export function FreeSpaceGuide({ activities }: FreeSpaceGuideProps) {
  const { t } = useI18n();
  const rows = activities
    ? [
        ...activities.backedUp.map((entry) => ({ entry, backedUp: true })),
        ...activities.pending.map((entry) => ({ entry, backedUp: false })),
      ].sort((a, b) => a.entry.name.localeCompare(b.entry.name))
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("device.guide.title")}</CardTitle>
        <CardDescription>{t("device.guide.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {activities === null ? (
          <p className="text-muted-foreground text-sm">{t("device.guide.noDevice")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm">{t("device.guide.none")}</p>
        ) : (
          <>
            <p className="text-sm">
              {t("device.guide.summary", {
                backedUp: activities.backedUp.length,
                total: rows.length,
                size: formatBytes(activities.reclaimableBytes),
              })}
            </p>
            {/* A scrollable region must be reachable by keyboard so it can be scrolled. */}
            <div
              role="region"
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
              tabIndex={0}
              aria-label={t("device.guide.tableLabel")}
              className="max-h-72 overflow-auto rounded-md border"
            >
              <Table>
                <TableCaption>{t("device.guide.caption")}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("device.guide.column.name")}</TableHead>
                    <TableHead>{t("device.guide.column.size")}</TableHead>
                    <TableHead>{t("device.guide.column.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ entry, backedUp }) => (
                    <TableRow key={entry.name}>
                      <TableCell>{entry.name}</TableCell>
                      <TableCell>{formatBytes(entry.size)}</TableCell>
                      <TableCell>
                        <Badge variant={backedUp ? "secondary" : "outline"}>
                          {t(backedUp ? "device.guide.backedUp" : "device.guide.pending")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
        <div>
          <p className="text-sm font-medium">{t("device.guide.stepsTitle")}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {STEPS.map((step) => (
              <li key={step}>{t(`device.guide.${step}`)}</li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
