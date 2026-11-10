import { ChevronDownIcon, ChevronUpIcon, RotateCcwIcon, RotateCwIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Ride } from "@/domain/ride";
import { bucketColor, valueBucket } from "@/domain/route";
import { visibleRange } from "@/domain/viz/privacy";
import { autoExaggeration, localTrack, projectRoute, type Vec3 } from "@/domain/viz/project3d";
import { formatAltitude } from "@/lib/units";

interface Route3DProps {
  ride: Ride;
}

const WIDTH = 960;
const HEIGHT = 520;
const MAX_POINTS = 2000;
const MIN_PITCH = 0.15;
const MAX_PITCH = 1.45;
const TURN_STEP = Math.PI / 12;
const TILT_STEP = 0.12;

/** Fewer points keep dragging smooth on a long ride; the shape does not change. */
function thin(points: Vec3[]): Vec3[] {
  if (points.length <= MAX_POINTS) return points;
  const step = (points.length - 1) / (MAX_POINTS - 1);
  return Array.from(
    { length: MAX_POINTS },
    (_, i) => points[Math.round(i * step)] ?? points[0]!,
  ).filter((p): p is Vec3 => p !== undefined);
}

/**
 * The route seen from an oblique camera with its altitude, on a canvas, with no 3D library: the
 * line is colored from low to high altitude and its shadow on the ground is drawn beneath it.
 * Drag to turn and tilt it, or use the buttons. The meters hidden at both ends by the map privacy
 * settings are not drawn.
 */
export function Route3D({ ride }: Route3DProps) {
  const { t } = useI18n();
  const { units, mapPrivacy } = useAppState();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [view, setView] = useState({ yaw: 0.6, pitch: 0.9 });

  const track = useMemo(
    () => thin(localTrack(ride, visibleRange(ride, mapPrivacy.hideEndsM))),
    [ride, mapPrivacy.hideEndsM],
  );
  const exaggeration = useMemo(() => autoExaggeration(track), [track]);
  const altitude = useMemo(() => {
    const zs = track.map((p) => p.z);
    return { low: Math.min(...zs), high: Math.max(...zs) };
  }, [track]);

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx || track.length === 0) return;

    const { line, ground } = projectRoute(track, {
      ...view,
      width: WIDTH,
      height: HEIGHT,
      margin: 28,
      exaggeration,
    });
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // The shadow of the route on the ground, and a few posts from the line down to it.
    ctx.strokeStyle = "rgba(120, 130, 145, 0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ground.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.strokeStyle = "rgba(120, 130, 145, 0.3)";
    ctx.lineWidth = 1;
    const posts = Math.max(1, Math.floor(line.length / 40));
    for (let i = 0; i < line.length; i += posts) {
      const top = line[i];
      const bottom = ground[i];
      if (!top || !bottom) continue;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.stroke();
    }

    // The route, from blue at its lowest point to red at its highest.
    const scale = { min: altitude.low, max: altitude.high };
    ctx.lineWidth = 5;
    for (let i = 1; i < line.length; i++) {
      const from = line[i - 1];
      const to = line[i];
      const point = track[i];
      if (!from || !to || !point) continue;
      ctx.strokeStyle = bucketColor(valueBucket(point.z, scale));
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    const start = line[0];
    const end = line[line.length - 1];
    for (const [point, color] of [
      [start, "#16a34a"],
      [end, "#111827"],
    ] as const) {
      if (!point) continue;
      ctx.fillStyle = color;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, [track, view, exaggeration, altitude]);

  const turn = (delta: number) => setView((v) => ({ ...v, yaw: v.yaw + delta }));
  const tilt = (delta: number) =>
    setView((v) => ({ ...v, pitch: Math.min(MAX_PITCH, Math.max(MIN_PITCH, v.pitch + delta)) }));

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    drag.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const last = drag.current;
    if (!last) return;
    drag.current = { x: event.clientX, y: event.clientY };
    turn((event.clientX - last.x) * 0.01);
    tilt(-(event.clientY - last.y) * 0.005);
  }
  function onPointerEnd() {
    drag.current = null;
  }

  if (track.length === 0) {
    return (
      <Alert>
        <AlertDescription>{t("map.3d.none")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-2">
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label={t("map.3d.label", {
          low: formatAltitude(altitude.low, units),
          high: formatAltitude(altitude.high, units),
        })}
        className="bg-muted/40 h-auto w-full cursor-grab touch-none rounded-lg border active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
      />
      <div
        role="group"
        aria-label={t("map.3d.title")}
        className="flex flex-wrap items-center gap-2"
      >
        <Button
          variant="outline"
          size="icon"
          aria-label={t("map.3d.left")}
          onClick={() => turn(-TURN_STEP)}
        >
          <RotateCcwIcon aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("map.3d.right")}
          onClick={() => turn(TURN_STEP)}
        >
          <RotateCwIcon aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("map.3d.up")}
          onClick={() => tilt(TILT_STEP)}
        >
          <ChevronUpIcon aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("map.3d.down")}
          onClick={() => tilt(-TILT_STEP)}
        >
          <ChevronDownIcon aria-hidden="true" />
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        {t("map.3d.hint")} {t("map.3d.exaggeration", { n: Math.round(exaggeration * 10) / 10 })}
      </p>
    </div>
  );
}
