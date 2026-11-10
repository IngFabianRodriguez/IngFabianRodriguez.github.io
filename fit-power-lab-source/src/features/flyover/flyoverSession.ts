import type { Translator } from "@/app/i18n";
import {
  chaseCamera,
  clearPitch,
  lookAt,
  multiply,
  perspective,
  projectPoint,
  shiftView,
  smoothPitches,
} from "@/domain/flyover/camera";
import { buildFlight, type FlightFrame } from "@/domain/flyover/flightPath";
import { LocalFrame } from "@/domain/flyover/localFrame";
import { buildRibbon, type Ribbon } from "@/domain/flyover/ribbon";
import { ElevationField } from "@/domain/flyover/terrarium";
import {
  buildTerrainMesh,
  meshIndices,
  surfaceY,
  type TerrainMesh,
} from "@/domain/flyover/terrainMesh";
import { patchOrigin, planImagery, planTerrain, type TileKey } from "@/domain/flyover/tilePlan";
import type { Ride } from "@/domain/ride";
import { sampleValues } from "@/domain/series";
import { visibleRange } from "@/domain/viz/privacy";
import { drawHud, FRAME_SIZES, hudTiles, type Orientation } from "@/features/flyover/hud";
import { composePatch, PATCH_PX, patchUv } from "@/features/flyover/groundPatch";
import { WebGlUnavailableError } from "@/features/flyover/errors";
import { FLYOVER_FPS, FLYOVER_FRAMES, FLYOVER_SECONDS } from "@/features/flyover/format";
import { createRenderer, type FlyoverRenderer } from "@/features/flyover/renderer";
import {
  imageryLoader,
  loadTiles,
  readPixelsFromCanvas,
  terrainLoader,
} from "@/features/flyover/tileStore";
import { loadTileImage, plainAttribution, type TileLoader } from "@/features/share/mapScene";
import type { TerrainConfig, TileConfig } from "@/lib/tiles";
import type { UnitSystem } from "@/lib/units";

export { WebGlUnavailableError };
export { FLYOVER_FPS, FLYOVER_FRAMES, FLYOVER_SECONDS };

/** Cells along each side of the terrain grid around the rider. */
const SEGMENTS = 160;
const EXAGGERATION = 1.6;
const PITCH_RAD = (26 * Math.PI) / 180;
/** The camera looks down at most this steeply to see over a hill. */
const MAX_PITCH_RAD = (62 * Math.PI) / 180;
/** The line of sight to the rider passes at least this far over the ground. */
const SIGHT_MARGIN_M = 10;
/** Frames on each side over which the pitch is eased. */
const PITCH_EASE_FRAMES = 24;
const FOV_RAD = (55 * Math.PI) / 180;
const CAMERA_DISTANCE_M = { vertical: 900, horizontal: 750 };
/** Where the rider is in the picture, as a fraction of its height from the top: below the overlay. */
const RIDER_SCREEN_Y = { vertical: 0.62, horizontal: 0.6 };
/** The camera stays at least this far over the ground below it. */
const CAMERA_CLEARANCE_M = 45;
const MARKER_LIFT_M = 6;
const HAZE: [number, number, number] = [0.74, 0.84, 0.91];
const GROUND_BACKGROUND = "#dfe4e8";
const SUN = { x: -0.45, y: 0.75, z: 0.48 };

const MAX_IMAGERY_TILES = 240;
const MAX_TERRAIN_TILES = 60;
const TILE_CONCURRENCY = 6;
/** Terrain is wanted this far from the rider when the map has no imagery to set the size. */
const FALLBACK_HALF_EXTENT_M = 2400;
/** The route is kept at about this spacing; a ribbon needs no more detail. */
const ROUTE_SPACING_M = 8;
const RIBBON_HALF_WIDTH_M = 5;
const RIBBON_LIFT_M = 2;
const RIBBON_MAX_GAP_M = 150;
const RIBBON_COLORS = {
  done: [0.22, 0.74, 0.97, 0.95] as [number, number, number, number],
  ahead: [0.98, 0.62, 0.1, 0.92] as [number, number, number, number],
};

export interface SessionDeps {
  loadImage: TileLoader;
  createRenderer(canvas: HTMLCanvasElement, indices: Uint32Array): FlyoverRenderer | null;
  createCanvas(width: number, height: number): HTMLCanvasElement;
  /** The pixels of a terrain tile image, which hold its heights. */
  readPixels(image: CanvasImageSource): Uint8ClampedArray;
}

const browserDeps: SessionDeps = {
  loadImage: loadTileImage,
  createRenderer,
  createCanvas: (width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  },
  readPixels: readPixelsFromCanvas,
};

export interface SessionOptions {
  ride: Ride;
  watts: number[];
  orientation: Orientation;
  units: UnitSystem;
  t: Translator;
  title: string;
  dateText: string;
  hideEndsM: number;
  tiles: TileConfig;
  terrain: TerrainConfig;
  /** Frames of the video; one minute at 30 frames a second when omitted. */
  frames?: number;
  /** Called after each tile arrives, with the fraction done from 0 to 1. */
  onTilesProgress?: (fraction: number) => void;
  signal?: AbortSignal;
  deps?: Partial<SessionDeps>;
}

export interface FlyoverSession {
  frameCount: number;
  size: { width: number; height: number };
  /** Paints frame `k` — the 3D map, the rider and the overlay — on a canvas of the size above. */
  renderFrame(k: number, ctx: CanvasRenderingContext2D): void;
  dispose(): void;
  /** What was asked of the servers and what arrived; for the report of a problem. */
  info: {
    imageryZoom: number;
    imageryRequested: number;
    imageryLoaded: number;
    terrainZoom: number;
    terrainRequested: number;
    terrainLoaded: number;
  };
}

interface RoutePoint {
  e: number;
  n: number;
  distanceM: number;
}

/** The route in meters of the frame, thinned, for the ribbon. */
function routeOf(ride: Ride, frame: LocalFrame, hideEndsM: number): RoutePoint[] {
  const visible = visibleRange(ride, hideEndsM);
  if (!visible) return [];
  const route: RoutePoint[] = [];
  for (let i = visible[0]; i <= visible[1]; i++) {
    const sample = ride.samples[i];
    if (sample?.lat === undefined || sample.lon === undefined) continue;
    const { e, n } = frame.toLocal(sample.lat, sample.lon);
    const last = route[route.length - 1];
    if (last && Math.hypot(e - last.e, n - last.n) < ROUTE_SPACING_M) continue;
    route.push({ e, n, distanceM: sample.distance });
  }
  return route;
}

function heightsField(zoom: number, tiles: Map<string, Float32Array>): ElevationField {
  const field = new ElevationField(zoom);
  for (const [key, heights] of tiles) {
    const [, x, y] = key.split("/").map(Number);
    if (x !== undefined && y !== undefined) field.addTile(x, y, heights);
  }
  return field;
}

/**
 * Gets everything a flight needs — the terrain and the map tiles along the route — and gives back
 * a session that paints any frame of it. Null when the ride has no route to fly over. Tiles that
 * do not arrive are simply missing from the picture.
 */
export async function createFlyoverSession(
  options: SessionOptions,
): Promise<FlyoverSession | null> {
  const deps: SessionDeps = { ...browserDeps, ...options.deps };
  const size = FRAME_SIZES[options.orientation];
  const frames = options.frames ?? FLYOVER_FRAMES;

  const flight = buildFlight(options.ride, sampleValues(options.ride, options.watts), {
    frames,
    hideEndsM: options.hideEndsM,
  });
  if (flight.length === 0) return null;

  // Ask nothing of any server in a browser that could not draw the result anyway.
  const glCanvas = deps.createCanvas(size.width, size.height);
  const indices = meshIndices(SEGMENTS);
  const renderer = deps.createRenderer(glCanvas, indices);
  if (!renderer) throw new WebGlUnavailableError();

  const positions: [number, number][] = flight.map((f) => [f.lat, f.lon]);
  const mid = flight[Math.floor(flight.length / 2)] ?? flight[0];
  const frame = new LocalFrame(mid?.lat ?? 0, mid?.lon ?? 0);

  const imageryUrl = options.tiles.url;
  const terrainUrl = options.terrain.url;
  const imageryPlan = imageryUrl
    ? planImagery(positions, {
        maxZoom: Math.min(options.tiles.maxZoom, 15),
        minZoom: 11,
        maxTiles: MAX_IMAGERY_TILES,
      })
    : null;
  const halfExtentM = imageryPlan
    ? 2 * frame.metersPerTile(imageryPlan.zoom)
    : FALLBACK_HALF_EXTENT_M;
  const terrainPlan = terrainUrl
    ? planTerrain(positions, {
        halfExtentM,
        maxZoom: Math.min(options.terrain.maxZoom, 13),
        minZoom: 8,
        maxTiles: MAX_TERRAIN_TILES,
      })
    : null;

  const toLoad = (plan: { tiles: TileKey[] } | null) => plan?.tiles.length ?? 0;
  const total = toLoad(imageryPlan) + toLoad(terrainPlan);
  let done = 0;
  const progress = () => options.onTilesProgress?.(total === 0 ? 1 : ++done / total);
  const loadOptions = {
    concurrency: TILE_CONCURRENCY,
    ...(options.signal ? { signal: options.signal } : {}),
    onProgress: progress,
  };
  options.onTilesProgress?.(0);
  const [imagery, terrainTiles] = await Promise.all([
    imageryPlan && imageryUrl
      ? loadTiles(imageryPlan.tiles, imageryLoader(imageryUrl, deps.loadImage), loadOptions)
      : Promise.resolve(new Map<string, CanvasImageSource>()),
    terrainPlan && terrainUrl
      ? loadTiles(
          terrainPlan.tiles,
          terrainLoader(terrainUrl, deps.loadImage, deps.readPixels),
          loadOptions,
        )
      : Promise.resolve(new Map<string, Float32Array>()),
  ]).catch((error: unknown) => {
    // Nothing will be painted, so the graphics context is given back before the failure goes on.
    renderer.dispose();
    throw error;
  });

  const field = terrainPlan ? heightsField(terrainPlan.zoom, terrainTiles) : null;
  const heightAt = (e: number, n: number): number | null => {
    if (!field) return null;
    const [tx, ty] = frame.tileCoords(e, n, field.zoom);
    return field.heightAtTile(tx, ty);
  };

  const route = routeOf(options.ride, frame, options.hideEndsM);

  // Where the rider is and how steeply the camera must look down to see them, for every frame.
  const centers = flight.map((f) => frame.toLocal(f.lat, f.lon));
  const riders = flight.map(
    (f, i) => heightAt(centers[i]?.e ?? 0, centers[i]?.n ?? 0) ?? f.metrics.altitude ?? 0,
  );
  const pitches = smoothPitches(
    flight.map((f, i) => {
      const c = centers[i] ?? { e: 0, n: 0 };
      const rider = riders[i] ?? 0;
      return clearPitch({
        target: { x: 0, y: MARKER_LIFT_M, z: 0 },
        bearingRad: f.bearingRad,
        distanceM: CAMERA_DISTANCE_M[options.orientation],
        basePitchRad: PITCH_RAD,
        maxPitchRad: MAX_PITCH_RAD,
        marginM: SIGHT_MARGIN_M,
        terrainY: (x, z) => ((heightAt(c.e + x, c.n - z) ?? rider) - rider) * EXAGGERATION,
      });
    }),
    PITCH_EASE_FRAMES,
  );
  const imageryZoom = imageryPlan?.zoom ?? 0;
  const patchCanvas = imageryPlan ? deps.createCanvas(PATCH_PX, PATCH_PX) : null;
  const patchCtx = patchCanvas?.getContext("2d") ?? null;
  const cellM = (2 * halfExtentM) / SEGMENTS;
  const aspect = size.width / size.height;
  const credit = [
    imagery.size > 0 ? plainAttribution(options.tiles.attribution) : "",
    terrainTiles.size > 0 ? options.terrain.attribution : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const footer = { title: options.title, dateText: options.dateText, credit };

  // What the ground picture now in the renderer was made for.
  let patchKey = "";

  function ribbonAround(
    f: FlightFrame,
    center: { e: number; n: number },
    mesh: TerrainMesh,
  ): Ribbon {
    const points: { x: number; y: number; z: number }[] = [];
    const done: boolean[] = [];
    for (const point of route) {
      if (
        Math.abs(point.e - center.e) > halfExtentM ||
        Math.abs(point.n - center.n) > halfExtentM
      ) {
        continue;
      }
      const x = point.e - center.e;
      const z = center.n - point.n;
      // On the surface that is drawn, so the ribbon is not hidden by the ground around it.
      const y = surfaceY(mesh, x, z);
      if (y === null) continue;
      points.push({ x, y, z });
      done.push(point.distanceM <= f.distanceM);
    }
    return buildRibbon(points, done, {
      halfWidthM: RIBBON_HALF_WIDTH_M,
      liftM: RIBBON_LIFT_M,
      maxGapM: RIBBON_MAX_GAP_M,
      colors: RIBBON_COLORS,
    });
  }

  return {
    frameCount: flight.length,
    size,
    info: {
      imageryZoom,
      imageryRequested: toLoad(imageryPlan),
      imageryLoaded: imagery.size,
      terrainZoom: terrainPlan?.zoom ?? 0,
      terrainRequested: toLoad(terrainPlan),
      terrainLoaded: terrainTiles.size,
    },

    renderFrame(k, ctx) {
      const f = flight[Math.min(flight.length - 1, Math.max(0, k))];
      if (!f) return;
      const index = Math.min(flight.length - 1, Math.max(0, k));
      const center = centers[index] ?? frame.toLocal(f.lat, f.lon);
      const rider = riders[index] ?? 0;
      const pitchRad = pitches[index] ?? PITCH_RAD;

      if (patchCtx && patchCanvas) {
        const origin = patchOrigin(f.lat, f.lon, imageryZoom);
        const key = `${origin.x}/${origin.y}`;
        if (key !== patchKey) {
          composePatch(patchCtx, origin, imageryZoom, imagery, GROUND_BACKGROUND);
          renderer.setGroundTexture(patchCanvas);
          patchKey = key;
        }
      }
      const origin = patchOrigin(f.lat, f.lon, imageryZoom);

      const mesh = buildTerrainMesh({
        segments: SEGMENTS,
        cellM,
        center,
        heightAt,
        fallbackHeight: rider,
        baseHeight: rider,
        exaggeration: EXAGGERATION,
        uvAt: (e, n) => {
          const [tx, ty] = frame.tileCoords(e, n, imageryZoom);
          return patchUv(origin, tx, ty);
        },
        sun: SUN,
      });

      const target = { x: 0, y: MARKER_LIFT_M, z: 0 };
      const lookDistance = CAMERA_DISTANCE_M[options.orientation];
      const probe = chaseCamera({
        target,
        bearingRad: f.bearingRad,
        distanceM: lookDistance,
        pitchRad,
        minHeightM: 0,
      }).eye;
      const below = heightAt(center.e + probe.x, center.n - probe.z) ?? rider;
      const { eye } = chaseCamera({
        target,
        bearingRad: f.bearingRad,
        distanceM: lookDistance,
        pitchRad,
        minHeightM: (below - rider) * EXAGGERATION + CAMERA_CLEARANCE_M,
      });
      const viewProjection = multiply(
        shiftView(1 - 2 * RIDER_SCREEN_Y[options.orientation]),
        multiply(perspective(FOV_RAD, aspect, 10, halfExtentM * 4), lookAt(eye, target)),
      );

      renderer.draw({
        mesh,
        ribbon: ribbonAround(f, center, mesh),
        viewProjection,
        eye,
        fogNear: halfExtentM * 0.55,
        fogFar: halfExtentM * 1.1,
        haze: HAZE,
      });

      ctx.drawImage(glCanvas, 0, 0, size.width, size.height);
      const at = projectPoint(viewProjection, { x: 0, y: MARKER_LIFT_M, z: 0 });
      drawMarker(
        ctx,
        (at.x * 0.5 + 0.5) * size.width,
        (0.5 - at.y * 0.5) * size.height,
        size.width,
      );
      drawHud(
        ctx,
        options.orientation,
        hudTiles(f, { units: options.units, t: options.t }),
        footer,
        f.fraction,
      );
    },

    dispose() {
      renderer.dispose();
    },
  };
}

/** The rider: a white ring with a red dot, sized for the picture. */
function drawMarker(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
  const radius = Math.max(14, width * 0.016);
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.7, 0, 2 * Math.PI);
  ctx.fillStyle = "rgba(15, 23, 42, 0.25)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.25, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.85, 0, 2 * Math.PI);
  ctx.fillStyle = "#ef4444";
  ctx.fill();
}
