import { Download, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { useI18n } from "@/app/I18nContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { clearTileCache, getCacheStats, precacheApp, type CacheStats } from "@/lib/serviceWorker";

/** The event Chromium fires when the app can be installed; it is not in the DOM typings. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface StorageUse {
  usage: number;
  quota: number;
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

function formatBytes(bytes: number, locale: string): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: unit === 0 ? 0 : 1 });
  return `${number.format(value)} ${BYTE_UNITS[unit]}`;
}

async function readStorage(): Promise<StorageUse | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return usage === undefined || quota === undefined ? null : { usage, quota };
  } catch {
    return null;
  }
}

function isStandalone(): boolean {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(display-mode: standalone)").matches
    : false;
}

/** Offline readiness, saved map tiles, storage used and the install button. */
export function OfflineCard() {
  const { t, locale } = useI18n();
  // undefined while the worker is being asked, null when there is no worker to ask.
  const [stats, setStats] = useState<CacheStats | null | undefined>(undefined);
  const [storage, setStorage] = useState<StorageUse | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const hintId = useId();

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const next = await getCacheStats();
      if (active) setStats(next);
      return next;
    };
    const refreshStorage = async () => {
      const next = await readStorage();
      if (active) setStorage(next);
    };

    void (async () => {
      const first = await refresh();
      // The first install can fail (for example while offline): ask the worker to try again.
      if (first && (first.shell === 0 || first.assets === 0)) {
        const retried = await precacheApp();
        if (active && retried) setStats(retried);
      }
      await refreshStorage();
    })();

    const onControllerChange = () => {
      void refresh();
    };
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    const worker = "serviceWorker" in navigator ? navigator.serviceWorker : null;
    worker?.addEventListener("controllerchange", onControllerChange);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      active = false;
      worker?.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const clearMaps = useCallback(async () => {
    setBusy(true);
    const removed = await clearTileCache();
    if (removed === null) {
      setMessage(t("offline.clear.failed"));
    } else {
      setMessage(t("offline.clear.done", { count: removed }));
      setStats(await getCacheStats());
      setStorage(await readStorage());
    }
    setBusy(false);
  }, [t]);

  const install = useCallback(async () => {
    if (!installEvent) return;
    // The browser lets each event be used once; a new one arrives if the user dismisses it.
    setInstallEvent(null);
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setMessage(t("offline.install.accepted"));
    } else {
      setMessage(t("offline.install.dismissed"));
    }
  }, [installEvent, t]);

  const ready = stats ? stats.shell > 0 && stats.assets > 0 : false;
  const statusKey =
    stats === undefined
      ? "offline.status.checking"
      : stats === null
        ? "offline.status.unavailable"
        : ready
          ? "offline.status.ready"
          : "offline.status.preparing";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("offline.title")}</CardTitle>
        <CardDescription>{t("offline.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <dl className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <dt>{t("offline.status.label")}</dt>
            <dd>
              <Badge variant={ready ? "default" : "secondary"}>{t(statusKey)}</Badge>
            </dd>
          </div>
          {stats ? (
            <div className="flex items-center justify-between gap-3">
              <dt>{t("offline.tiles.label")}</dt>
              <dd>{t("offline.tiles.value", { count: stats.tiles, limit: stats.tileLimit })}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <dt>{t("offline.storage.label")}</dt>
            <dd>
              {storage
                ? t("offline.storage.value", {
                    used: formatBytes(storage.usage, locale),
                    quota: formatBytes(storage.quota, locale),
                  })
                : t("offline.storage.unknown")}
            </dd>
          </div>
        </dl>
        {stats === null ? (
          <p className="text-muted-foreground">{t("offline.status.unavailableHint")}</p>
        ) : null}
        <p className="text-muted-foreground text-xs">{t("offline.privacy")}</p>
        <p role="status" className="min-h-5">
          {message}
        </p>
      </CardContent>
      <CardFooter className="flex flex-wrap items-start gap-3">
        <Button
          variant="outline"
          onClick={() => void clearMaps()}
          disabled={busy || !stats || stats.tiles === 0}
        >
          <Trash2 aria-hidden="true" />
          {t("offline.clear")}
        </Button>
        <Button
          onClick={() => void install()}
          disabled={!installEvent}
          aria-describedby={installEvent ? undefined : hintId}
        >
          <Download aria-hidden="true" />
          {t("offline.install")}
        </Button>
        <p id={hintId} className="text-muted-foreground w-full text-xs">
          {installed
            ? t("offline.install.installed")
            : installEvent
              ? ""
              : t("offline.install.unavailable")}
        </p>
      </CardFooter>
    </Card>
  );
}
