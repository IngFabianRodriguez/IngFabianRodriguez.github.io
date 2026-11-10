import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PauseIcon, PlayIcon } from "lucide-react";
import { useEffect, useId, useMemo, useRef } from "react";
import { useAppActions, useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Ride } from "@/domain/ride";
import { bucketColor, POWER_BUCKETS } from "@/domain/route";
import type { SeriesKey } from "@/domain/series";
import { detectStops } from "@/domain/stops";
import { positionAtKm } from "@/domain/viz/cursor";
import { kmMarkers } from "@/domain/viz/kmMarkers";
import { buildRouteLayer, mapVariables, resolveMapVariable } from "@/domain/viz/mapLayer";
import { visiblePositions } from "@/domain/viz/tracks";
import { REPLAY_SPEEDS, useReplay } from "@/features/map/useReplay";
import { tileConfig } from "@/lib/tiles";
import {
  formatAltitude,
  formatDuration,
  formatSpeed,
  formatTemperature,
  type UnitSystem,
} from "@/lib/units";

interface RouteMapProps {
  ride: Ride;
  /** Estimated watts, aligned with `ride.samples`. */
  watts: number[];
}

/** A value of the scale of a variable, in the user's units. */
function formatScaleValue(variable: SeriesKey, value: number, units: UnitSystem): string {
  switch (variable) {
    case "speed":
      return formatSpeed(value, units, 0);
    case "altitude":
      return formatAltitude(value, units, 0);
    case "temperature":
      return formatTemperature(value, units, 0);
    case "power":
      return `${Math.round(value)} W`;
    case "cadence":
      return `${Math.round(value)} rpm`;
    case "heartRate":
      return `${Math.round(value)} bpm`;
    case "grade":
      return `${value.toFixed(1)} %`;
  }
}

/** A small white badge with the kilometer number, readable on any map background. */
const KM_BADGE_STYLE =
  "display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:#fff;border:1.5px solid #374151;color:#111827;font:600 10px system-ui,sans-serif;box-shadow:0 1px 2px rgba(0,0,0,.35)";

const CURSOR_STYLE = {
  radius: 8,
  color: "#ffffff",
  weight: 2,
  fillColor: "#2563eb",
  fillOpacity: 1,
};

export function RouteMap({ ride, watts }: RouteMapProps) {
  const { t } = useI18n();
  const { units, mapVariable, mapPrivacy, cursorKm } = useAppState();
  const { setMapVariable, setCursorKm } = useAppActions();
  const container = useRef<HTMLDivElement>(null);
  const cursorMarker = useRef<L.CircleMarker | null>(null);
  const map = useRef<L.Map | null>(null);
  const selectId = useId();

  const hideEndsM = mapPrivacy.hideEndsM;
  const available = useMemo(() => mapVariables(ride, watts), [ride, watts]);
  const variable = resolveMapVariable(mapVariable, available);
  const layer = useMemo(
    () => buildRouteLayer(ride, watts, variable, hideEndsM),
    [ride, watts, variable, hideEndsM],
  );
  const hasPositions = useMemo(
    () => ride.samples.some((s) => s.lat !== undefined && s.lon !== undefined),
    [ride],
  );
  const positions = useMemo(() => visiblePositions(ride, hideEndsM), [ride, hideEndsM]);
  const markers = useMemo(() => kmMarkers(ride, units, hideEndsM, 24), [ride, units, hideEndsM]);
  const stops = useMemo(() => {
    const [from, to] = layer.visible ?? [1, 0];
    return detectStops(ride).filter(
      (s) =>
        s.lat !== undefined && s.lon !== undefined && s.startIndex >= from && s.startIndex <= to,
    );
  }, [ride, layer.visible]);
  const tiles = tileConfig(mapPrivacy);

  const span = useMemo<[number, number] | null>(() => {
    if (!layer.visible) return null;
    const first = ride.samples[layer.visible[0]];
    const last = ride.samples[layer.visible[1]];
    return first && last ? [first.distance / 1000, last.distance / 1000] : null;
  }, [ride, layer.visible]);
  const replay = useReplay({ ride, span, cursorKm, onKm: setCursorKm });

  const stopLabels = stops.map((s) =>
    t(s.kind === "pause" ? "map.pause" : "map.stop", { duration: formatDuration(s.durationS) }),
  );
  const startLabel = t("map.start");
  const finishLabel = t("map.finish");
  const stopKey = stopLabels.join("|");

  useEffect(() => {
    const element = container.current;
    const first = positions[0];
    const last = positions[positions.length - 1];
    if (!element || !first || !last) return;

    // Leaflet needs the view set before vector layers are added: it creates their renderer
    // lazily, and a route added to a map without a view reads bounds that do not exist yet.
    const leaflet = L.map(element);
    map.current = leaflet;
    leaflet.fitBounds(L.latLngBounds(positions), { padding: [24, 24] });

    if (tiles.url) {
      L.tileLayer(tiles.url, { maxZoom: tiles.maxZoom, attribution: tiles.attribution }).addTo(
        leaflet,
      );
    }
    for (const line of layer.lines) {
      L.polyline(line.points, { color: bucketColor(line.bucket), weight: 4, opacity: 0.9 }).addTo(
        leaflet,
      );
    }
    for (const marker of markers) {
      L.marker(marker.position, {
        icon: L.divIcon({
          className: "",
          html: `<span style="${KM_BADGE_STYLE}">${marker.label}</span>`,
          iconSize: [22, 22],
        }),
        interactive: false,
        keyboard: false,
      }).addTo(leaflet);
    }
    stops.forEach((stop, index) => {
      if (stop.lat === undefined || stop.lon === undefined) return;
      L.circleMarker([stop.lat, stop.lon], {
        radius: 7,
        color: "#ffffff",
        fillColor: "#f59e0b",
        fillOpacity: 1,
      })
        .bindTooltip(stopLabels[index] ?? "")
        .addTo(leaflet);
    });
    L.circleMarker(first, { radius: 7, color: "#ffffff", fillColor: "#16a34a", fillOpacity: 1 })
      .bindTooltip(startLabel)
      .addTo(leaflet);
    L.circleMarker(last, { radius: 7, color: "#ffffff", fillColor: "#111827", fillOpacity: 1 })
      .bindTooltip(finishLabel)
      .addTo(leaflet);
    cursorMarker.current = L.circleMarker(first, CURSOR_STYLE);

    return () => {
      cursorMarker.current = null;
      map.current = null;
      leaflet.remove();
    };
    // stopKey stands for the stop labels, which are rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    positions,
    layer,
    markers,
    stops,
    stopKey,
    tiles.url,
    tiles.attribution,
    tiles.maxZoom,
    startLabel,
    finishLabel,
  ]);

  // The marker follows the shared cursor; it is not drawn while the cursor is off the visible route.
  useEffect(() => {
    const marker = cursorMarker.current;
    const leaflet = map.current;
    if (!marker || !leaflet) return;
    const position = cursorKm === null ? undefined : positionAtKm(ride, cursorKm, hideEndsM);
    if (position) {
      marker.setLatLng(position);
      if (!leaflet.hasLayer(marker)) marker.addTo(leaflet);
    } else if (leaflet.hasLayer(marker)) {
      marker.remove();
    }
  }, [cursorKm, ride, hideEndsM, positions, layer, markers, stops]);

  if (!hasPositions) {
    return (
      <Alert>
        <AlertTitle>{t("map.none.title")}</AlertTitle>
        <AlertDescription>{t("map.none.body")}</AlertDescription>
      </Alert>
    );
  }
  if (positions.length === 0) {
    return (
      <Alert>
        <AlertTitle>{t("map.hiddenAll.title")}</AlertTitle>
        <AlertDescription>{t("map.hiddenAll.body")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={selectId} className="text-sm">
          {t("map.variable.label")}
        </Label>
        <Select value={variable} onValueChange={(value) => setMapVariable(value as SeriesKey)}>
          <SelectTrigger id={selectId} size="sm" className="min-w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {available.map((key) => (
              <SelectItem key={key} value={key}>
                {t(`map.var.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div
        ref={container}
        role="region"
        aria-label={t("map.region")}
        className="bg-muted h-[28rem] w-full overflow-hidden rounded-lg border"
      />
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <div
          aria-hidden="true"
          className="h-3 w-full max-w-40 shrink-0 rounded-full"
          style={{
            background: `linear-gradient(to right, ${bucketColor(0)}, ${bucketColor(POWER_BUCKETS - 1)})`,
          }}
        />
        <span className="text-xs sm:text-sm">
          {t("map.legend", {
            name: t(`map.legendName.${variable}`),
            min: formatScaleValue(variable, layer.scale.min, units),
            max: formatScaleValue(variable, layer.scale.max, units),
          })}
        </span>
      </div>
      {span ? (
        <div
          role="group"
          aria-label={t("map.replay.group")}
          className="flex flex-wrap items-center gap-3"
        >
          <Button variant="outline" size="sm" onClick={replay.toggle}>
            {replay.playing ? <PauseIcon aria-hidden="true" /> : <PlayIcon aria-hidden="true" />}
            {replay.playing ? t("map.replay.pause") : t("map.replay.play")}
          </Button>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={String(replay.speed)}
            onValueChange={(value) => {
              if (value) replay.setSpeed(Number(value));
            }}
            aria-label={t("map.replay.speed")}
          >
            {REPLAY_SPEEDS.map((speed) => (
              <ToggleGroupItem key={speed} value={String(speed)}>
                {`${speed}x`}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : null}
    </div>
  );
}
