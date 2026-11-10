import { useMemo } from "react";
import { useAppActions, useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Button } from "@/components/ui/button";
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
import { summarizeLoaded } from "@/domain/import/activitySummary";
import { formatDateTime } from "@/features/library/format";
import { formatDistance, formatDuration } from "@/lib/units";

/** The rides of this session: choose the one shown, the one to compare it with, or remove. */
export function LoadedRides() {
  const { t, locale } = useI18n();
  const { rides, activeId, compareId, units } = useAppState();
  const { selectRide, setCompare, removeRide } = useAppActions();
  const summaries = useMemo(
    () => rides.map((ride) => ({ ride, summary: summarizeLoaded(ride.fit, ride.ride) })),
    [rides],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("library.loaded.title")}</h2>
        </CardTitle>
        <CardDescription>{t("library.loaded.hint")}</CardDescription>
      </CardHeader>
      <CardContent>
        {rides.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("library.loaded.empty")}</p>
        ) : (
          <Table>
            <TableCaption>{t("library.loaded.caption")}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">{t("library.loaded.col.name")}</TableHead>
                <TableHead scope="col">{t("library.device.col.date")}</TableHead>
                <TableHead scope="col">{t("library.device.col.distance")}</TableHead>
                <TableHead scope="col">{t("library.device.col.duration")}</TableHead>
                <TableHead scope="col">{t("library.loaded.col.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map(({ ride, summary }) => {
                const active = ride.id === activeId;
                const comparing = ride.id === compareId;
                return (
                  <TableRow key={ride.id}>
                    <TableCell className="break-all">{ride.fileName}</TableCell>
                    <TableCell>{formatDateTime(summary.startTime.getTime(), locale)}</TableCell>
                    <TableCell>{formatDistance(summary.distanceM / 1000, units, 1)}</TableCell>
                    <TableCell>{formatDuration(summary.durationS)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={active ? "default" : "outline"}
                          aria-pressed={active}
                          aria-label={t(
                            active ? "library.loaded.showingAria" : "library.loaded.showAria",
                            {
                              name: ride.fileName,
                            },
                          )}
                          onClick={() => selectRide(ride.id)}
                        >
                          {active ? t("library.loaded.showing") : t("library.loaded.show")}
                        </Button>
                        <Button
                          size="sm"
                          variant={comparing ? "default" : "outline"}
                          aria-pressed={comparing}
                          disabled={active}
                          aria-label={t(
                            comparing
                              ? "library.loaded.comparingAria"
                              : "library.loaded.compareAria",
                            { name: ride.fileName },
                          )}
                          onClick={() => setCompare(comparing ? null : ride.id)}
                        >
                          {comparing ? t("library.loaded.comparing") : t("library.loaded.compare")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={t("library.loaded.removeAria", { name: ride.fileName })}
                          onClick={() => removeRide(ride.id)}
                        >
                          {t("library.loaded.remove")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
