import { useAppActions, useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { decodeRideFile } from "@/domain/import/decode";
import { formatDateTime } from "@/features/library/format";
import { useStoreSnapshot } from "@/features/library/useStoreSnapshot";
import { rememberSource } from "@/lib/persistence/sources";
import { formatDistance } from "@/lib/units";

/** Files opened before: only their metadata is remembered, and they reopen while the bytes are kept. */
export function RecentFiles() {
  const { t, locale } = useI18n();
  const { rides, units } = useAppState();
  const { addRide, selectRide } = useAppActions();
  const { recent, stored } = useStoreSnapshot();

  function open(fileName: string) {
    const loaded = rides.find((ride) => ride.fileName === fileName);
    if (loaded) {
      selectRide(loaded.id);
      return;
    }
    const kept = stored.find((item) => item.fileName === fileName);
    if (!kept) return;
    try {
      const decoded = decodeRideFile(kept.fileName, kept.bytes);
      rememberSource(decoded.fit, kept.bytes, { persisted: true });
      addRide({
        id: kept.id,
        fileName: kept.fileName,
        source: kept.source,
        fit: decoded.fit,
        ride: decoded.ride,
      });
    } catch {
      // Bytes that no longer decode are treated as not kept.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("library.recent.title")}</h2>
        </CardTitle>
        <CardDescription>{t("library.recent.hint")}</CardDescription>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("library.recent.empty")}</p>
        ) : (
          <ul className="grid gap-3">
            {recent.map((file) => {
              const available =
                rides.some((r) => r.fileName === file.fileName) ||
                stored.some((s) => s.fileName === file.fileName);
              return (
                <li key={file.key} className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <p className="break-all font-medium">{file.fileName}</p>
                    <p className="text-muted-foreground">
                      {[
                        file.startTime === null ? null : formatDateTime(file.startTime, locale),
                        file.distanceM === null
                          ? null
                          : formatDistance(file.distanceM / 1000, units, 1),
                        t("library.recent.opened", { date: formatDateTime(file.openedAt, locale) }),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {available ? null : (
                      <p className="text-muted-foreground">{t("library.recent.notKept")}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!available}
                    aria-label={t("library.recent.openAria", { name: file.fileName })}
                    onClick={() => open(file.fileName)}
                  >
                    {t("library.recent.open")}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
