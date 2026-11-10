import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import { useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Ride } from "@/domain/ride";
import { routePoints } from "@/features/library/compareData";
import { tileConfig } from "@/lib/tiles";

interface CompareMapProps {
  a: { name: string; ride: Ride };
  b: { name: string; ride: Ride };
}

/** Two colors that also differ in line style, so the routes never rely on color alone. */
const STYLE_A = { color: "#2563eb", weight: 4, opacity: 0.9 };
const STYLE_B = { color: "#ea580c", weight: 4, opacity: 0.9, dashArray: "8 6" };

/** Both routes on one map, for comparing where two rides went. */
export function CompareMap({ a, b }: CompareMapProps) {
  const { t } = useI18n();
  const { mapPrivacy } = useAppState();
  const container = useRef<HTMLDivElement>(null);
  const tiles = useMemo(() => tileConfig(mapPrivacy), [mapPrivacy]);
  const hideEndsM = mapPrivacy.hideEndsM;
  const pointsA = useMemo(() => routePoints(a.ride, hideEndsM), [a.ride, hideEndsM]);
  const pointsB = useMemo(() => routePoints(b.ride, hideEndsM), [b.ride, hideEndsM]);

  useEffect(() => {
    const element = container.current;
    const all = [...pointsA, ...pointsB];
    if (!element || all.length === 0) return;

    // The view must be set before vector layers are added: Leaflet creates their renderer lazily.
    const map = L.map(element);
    map.fitBounds(L.latLngBounds(all), { padding: [24, 24] });

    if (tiles.url !== null) {
      L.tileLayer(tiles.url, { maxZoom: tiles.maxZoom, attribution: tiles.attribution }).addTo(map);
    }
    if (pointsA.length > 1) L.polyline(pointsA, STYLE_A).addTo(map);
    if (pointsB.length > 1) L.polyline(pointsB, STYLE_B).addTo(map);

    return () => {
      map.remove();
    };
  }, [pointsA, pointsB, tiles]);

  if (pointsA.length === 0 && pointsB.length === 0) {
    return (
      <Alert>
        <AlertDescription>{t("library.compare.noGps")}</AlertDescription>
      </Alert>
    );
  }

  const missing = pointsA.length === 0 ? a.name : pointsB.length === 0 ? b.name : null;
  return (
    <div className="grid gap-2">
      <div
        ref={container}
        role="region"
        aria-label={t("library.compare.map")}
        className="h-[24rem] w-full overflow-hidden rounded-lg border"
      />
      <p className="text-sm">{t("library.compare.mapLegend", { a: a.name, b: b.name })}</p>
      {missing ? (
        <p className="text-muted-foreground text-sm">
          {t("library.compare.noGpsOne", { name: missing })}
        </p>
      ) : null}
    </div>
  );
}
