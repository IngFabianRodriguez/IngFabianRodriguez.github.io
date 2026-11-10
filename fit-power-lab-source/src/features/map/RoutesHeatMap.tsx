import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import { useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { LatLon } from "@/domain/route";
import { trackSegments } from "@/domain/viz/tracks";
import { tileConfig } from "@/lib/tiles";

/** Points per line: enough for the shape of a ride, light enough for dozens of rides. */
const MAX_POINTS_PER_LINE = 1500;

/**
 * Every loaded ride drawn at once as translucent lines: where many rides overlap the color builds
 * up, which shows the roads the rider uses most. The meters hidden at the ends of the routes by
 * the map privacy settings are not drawn, and the background comes from the privacy settings.
 */
export function RoutesHeatMap() {
  const { t } = useI18n();
  const { rides, mapPrivacy } = useAppState();
  const container = useRef<HTMLDivElement>(null);

  const perRide = useMemo(
    () => rides.map((r) => trackSegments(r.ride, mapPrivacy.hideEndsM, MAX_POINTS_PER_LINE)),
    [rides, mapPrivacy.hideEndsM],
  );
  const lines = useMemo(() => perRide.flat(), [perRide]);
  const drawnRides = perRide.filter((segments) => segments.length > 0).length;
  const tiles = tileConfig(mapPrivacy);

  useEffect(() => {
    const element = container.current;
    if (!element || lines.length === 0) return;

    // The view is set before any vector layer is added, as Leaflet requires.
    const map = L.map(element);
    const all: LatLon[] = lines.flat();
    map.fitBounds(L.latLngBounds(all), { padding: [24, 24] });
    if (tiles.url) {
      L.tileLayer(tiles.url, { maxZoom: tiles.maxZoom, attribution: tiles.attribution }).addTo(map);
    }
    for (const line of lines) {
      L.polyline(line, { color: "#2563eb", weight: 4, opacity: 0.22, lineCap: "round" }).addTo(map);
    }
    return () => {
      map.remove();
    };
  }, [lines, tiles.url, tiles.attribution, tiles.maxZoom]);

  if (lines.length === 0) {
    return (
      <Alert>
        <AlertTitle>{t("map.heat.none.title")}</AlertTitle>
        <AlertDescription>{t("map.heat.none.body")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-2">
      <div
        ref={container}
        role="region"
        aria-label={t("map.heat.region")}
        className="bg-muted h-[28rem] w-full overflow-hidden rounded-lg border"
      />
      <p className="text-muted-foreground text-sm">
        {t(drawnRides === 1 ? "map.heat.legendOne" : "map.heat.legend", { count: drawnRides })}
      </p>
    </div>
  );
}
