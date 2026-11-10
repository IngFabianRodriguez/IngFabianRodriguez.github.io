import type { Translator } from "@/app/i18n";
import {
  chaseCamera,
  clearPitch,
  lerpCameraParams,
  lookAt,
  multiply,
  overviewCamera,
  perspective,
  projectPoint,
  shiftView,
  smoothPitches,
  type CameraParams,
  type RouteExtents,
  type Vec3,
} from "@/domain/flyover/camera";
import { buildFlight } from "@/domain/flyover/flightPath";
import { LocalFrame } from "@/domain/flyover/localFrame";
import { buildRibbon, type Ribbon } from "@/domain/flyover/ribbon";
import { ElevationField } from "@/domain/flyover/terrarium";
import { buildTerrainMesh, meshIndices, surfaceY } from "@/domain/flyover/terrainMesh";
import { buildTimeline, crossfade, ease, phaseAt, type Phase } from "@/domain/flyover/timeline";
import {
  centeredOrigin,
  keyOf,
  overviewZoom,
  patchOrigin,
  patchTiles,
  planImagery,
  planTerrain,
  type TileKey,
} from "@/domain/flyover/tilePlan";
import type { Ride } from "@/domain/ride";
import { sampleValues } from "@/domain/series";
import { visibleRange } from "@/domain/viz/privacy";
import { WebGlUnavailableError } from "@/features/flyover/errors";
import { DEFAULT_FLYOVER_MINUTES, FLYOVER_FPS, flyoverFrames } from "@/features/flyover/format";
import { composePatch, PATCH_PX, patchUv } from "@/features/flyover/groundPatch";
import { drawHud, FRAME_SIZES, hudTiles, type Orientation } from "@/features/flyover/hud";
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

/** Cells along each side of the terrain grid around the point the camera looks at. */
const SEGMENTS = 160;
const EXAGGERATION = 1.6;
/** The camera behind the rider looks down this much, more where a hill is in the way. */
const PITCH_RAD = (34 * Math.PI) / 180;
/** The camera looks down at most this steeply to see over a hill. */
const MAX_PITCH_RAD = (62 * Math.PI) / 180;
/** The line of sight to the rider passes at least this far over the ground. */
const SIGHT_MARGIN_M = 10;
/** Frames on each side over which the pitch is eased. */
const PITCH_EASE_FRAMES = 24;
const FOV_RAD = (55 * Math.PI) / 180;
const CAMERA_DISTANCE_M = { vertical: 1300, horizontal: 1050 };
/** Where the rider is in the picture, as a fraction of its height from the top: below the overlay. */
const RIDER_SCREEN_Y = { vertical: 0.62, horizontal: 0.6 };
/** The camera stays at least this far over the ground below it. */
const CAMERA_CLEARANCE_M = 45;
const MARKER_LIFT_M = 6;
const HAZE: [number, number, number] = [0.74, 0.84, 0.91];
const GROUND_BACKGROUND = "#dfe4e8";
const SUN = { x: -0.45, y: 0.75, z: 0.48 };

/** The view of the whole route: from high up, looking down steeply. */
const OVERVIEW_PITCH_RAD = (55 * Math.PI) / 180;
const OVERVIEW_MARGIN = 1.25;
/** The part of the height of the picture that is free for the map, under the overlay. */
const OVERVIEW_USABLE_HEIGHT = 0.6;
const OVERVIEW_MIN_DISTANCE_M = 2500;
const OVERVIEW_MAX_ZOOM = 15;
const OVERVIEW_MIN_ZOOM = 5;
const OVERVIEW_TERRAIN_MIN_ZOOM = 3;

const CHASE_MAX_ZOOM = 14;
const MAX_IMAGERY_TILES = 240;
const MAX_TERRAIN_TILES = 60;
const TILE_CONCURRENCY = 6;
/** Terrain is wanted this far from the rider when the map has no imagery to set the size. */
const FALLBACK_HALF_EXTENT_M = 2400;
/** The route is kept at about this spacing; a ribbon needs no more detail. */
const ROUTE_SPACING_M = 8;
const RIBBON_MIN_HALF_WIDTH_M = 5;
/** The ribbon is wider the further the camera is, so that it can be seen from the overview. */
const RIBBON_WIDTH_PER_DISTANCE = 0.004;
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
    overviewImageryZoom: number;
    imageryRequested: number;
    imageryLoaded: number;
    terrainZoom: number;
    overviewTerrainZoom: number;
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
 * One picture of the ground: its map tiles put together, its terrain, and how far around its center
 * it reaches. The flight uses two: a detailed one around the rider, and one of the whole route.
 */
interface GroundLayer {
  id: "chase" | "overview";
  zoom: number;
  halfExtentM: number;
  cellM: number;
  heightAt(e: number, n: number): number | null;
  patch: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null };
  /** The block of tiles now drawn on the patch. */
  composedKey: string;
}

/** Where the center of a layer is, and the height that is zero in its scene. */
interface LayerView {
  center: { e: number; n: number };
  baseHeightM: number;
  origin: { x: number; y: number };
}

/**
 * Gets everything a flight needs — the terrain and the map tiles along the route and over the
 * whole of it — and gives back a session that paints any frame of it: the opening that comes down
 * from the overview, the flight along the route, and the closing that goes back up. Null when the
 * ride has no route to fly over. Tiles that do not arrive are simply missing from the picture.
 */
export async function createFlyoverSession(
  options: SessionOptions,
): Promise<FlyoverSession | null> {
  const deps: SessionDeps = { ...browserDeps, ...options.deps };
  const size = FRAME_SIZES[options.orientation];
  const total = options.frames ?? flyoverFrames(DEFAULT_FLYOVER_MINUTES);
  const timeline = buildTimeline(total, FLYOVER_FPS);

  const flight = buildFlight(options.ride, sampleValues(options.ride, options.watts), {
    frames: timeline.flight,
    hideEndsM: options.hideEndsM,
  });
  if (flight.length === 0) return null;

  // Ask nothing of any server in a browser that could not draw the result anyway.
  const glCanvas = deps.createCanvas(size.width, size.height);
  const indices = meshIndices(SEGMENTS);
  const renderer = deps.createRenderer(glCanvas, indices);
  if (!renderer) throw new WebGlUnavailableError();
  const gpu: FlyoverRenderer = renderer;

  const positions: [number, number][] = flight.map((f) => [f.lat, f.lon]);
  const mid = flight[Math.floor(flight.length / 2)] ?? flight[0];
  const frame = new LocalFrame(mid?.lat ?? 0, mid?.lon ?? 0);
  const route = routeOf(options.ride, frame, options.hideEndsM);

  const extents: RouteExtents = route.reduce(
    (box, p) => ({
      minE: Math.min(box.minE, p.e),
      maxE: Math.max(box.maxE, p.e),
      minN: Math.min(box.minN, p.n),
      maxN: Math.max(box.maxN, p.n),
    }),
    { minE: Infinity, maxE: -Infinity, minN: Infinity, maxN: -Infinity },
  );
  const aspect = size.width / size.height;
  const overview = overviewCamera(extents, {
    aspect,
    fovRad: FOV_RAD,
    pitchRad: OVERVIEW_PITCH_RAD,
    minDistanceM: OVERVIEW_MIN_DISTANCE_M,
    usableHeight: OVERVIEW_USABLE_HEIGHT,
    margin: OVERVIEW_MARGIN,
  });
  const [overviewLat, overviewLon] = frame.toLatLon(overview.center.e, overview.center.n);

  const imageryUrl = options.tiles.url;
  const terrainUrl = options.terrain.url;
  const chaseImageryPlan = imageryUrl
    ? planImagery(positions, {
        maxZoom: Math.min(options.tiles.maxZoom, CHASE_MAX_ZOOM),
        minZoom: 11,
        maxTiles: MAX_IMAGERY_TILES,
      })
    : null;
  const chaseHalfExtentM = chaseImageryPlan
    ? 2 * frame.metersPerTile(chaseImageryPlan.zoom)
    : FALLBACK_HALF_EXTENT_M;

  const routeSideM = Math.max(extents.maxE - extents.minE, extents.maxN - extents.minN);
  const overviewImageryZoom = overviewZoom(routeSideM, overviewLat, {
    maxZoom: Math.min(options.tiles.maxZoom, OVERVIEW_MAX_ZOOM),
    minZoom: OVERVIEW_MIN_ZOOM,
  });
  const overviewOrigin = centeredOrigin(overviewLat, overviewLon, overviewImageryZoom);
  const overviewHalfExtentM = imageryUrl
    ? 2.5 * frame.metersPerTile(overviewImageryZoom)
    : Math.max(FALLBACK_HALF_EXTENT_M, routeSideM);

  const chaseTerrainPlan = terrainUrl
    ? planTerrain(positions, {
        halfExtentM: chaseHalfExtentM,
        maxZoom: Math.min(options.terrain.maxZoom, 13),
        minZoom: 8,
        maxTiles: MAX_TERRAIN_TILES,
      })
    : null;
  const overviewTerrainPlan = terrainUrl
    ? planTerrain([[overviewLat, overviewLon]], {
        halfExtentM: overviewHalfExtentM,
        maxZoom: Math.min(options.terrain.maxZoom, 13),
        minZoom: OVERVIEW_TERRAIN_MIN_ZOOM,
        maxTiles: MAX_TERRAIN_TILES,
      })
    : null;

  // The tiles of the two pictures of the ground; the zoom is part of the key, so none repeats.
  const imageryKeys = new Map<string, TileKey>();
  if (imageryUrl) {
    for (const tile of [
      ...(chaseImageryPlan?.tiles ?? []),
      ...patchTiles(overviewOrigin, overviewImageryZoom),
    ]) {
      imageryKeys.set(keyOf(tile), tile);
    }
  }
  const imageryTiles = [...imageryKeys.values()];
  const chaseTerrainTiles = chaseTerrainPlan?.tiles ?? [];
  const overviewTerrainTiles = overviewTerrainPlan?.tiles ?? [];

  const totalTiles = imageryTiles.length + chaseTerrainTiles.length + overviewTerrainTiles.length;
  let done = 0;
  const loadOptions = {
    concurrency: TILE_CONCURRENCY,
    ...(options.signal ? { signal: options.signal } : {}),
    onProgress: () => options.onTilesProgress?.(totalTiles === 0 ? 1 : ++done / totalTiles),
  };
  options.onTilesProgress?.(0);
  const loadTerrain = (tiles: TileKey[]) =>
    terrainUrl
      ? loadTiles(tiles, terrainLoader(terrainUrl, deps.loadImage, deps.readPixels), loadOptions)
      : Promise.resolve(new Map<string, Float32Array>());
  const [imagery, chaseTerrainLoaded, overviewTerrainLoaded] = await Promise.all([
    imageryUrl
      ? loadTiles(imageryTiles, imageryLoader(imageryUrl, deps.loadImage), loadOptions)
      : Promise.resolve(new Map<string, CanvasImageSource>()),
    loadTerrain(chaseTerrainTiles),
    loadTerrain(overviewTerrainTiles),
  ]).catch((error: unknown) => {
    // Nothing will be painted, so the graphics context is given back before the failure goes on.
    gpu.dispose();
    throw error;
  });

  const heightFunction = (plan: { zoom: number } | null, tiles: Map<string, Float32Array>) => {
    const field = plan ? heightsField(plan.zoom, tiles) : null;
    return (e: number, n: number): number | null => {
      if (!field) return null;
      const [tx, ty] = frame.tileCoords(e, n, field.zoom);
      return field.heightAtTile(tx, ty);
    };
  };
  const chaseHeight = heightFunction(chaseTerrainPlan, chaseTerrainLoaded);
  const overviewHeight = heightFunction(overviewTerrainPlan, overviewTerrainLoaded);
  const groundAt = (e: number, n: number) => chaseHeight(e, n) ?? overviewHeight(e, n);

  const newPatch = () => {
    const canvas = deps.createCanvas(PATCH_PX, PATCH_PX);
    return { canvas, ctx: canvas.getContext("2d") };
  };
  const chaseLayer: GroundLayer = {
    id: "chase",
    zoom: chaseImageryPlan?.zoom ?? 0,
    halfExtentM: chaseHalfExtentM,
    cellM: (2 * chaseHalfExtentM) / SEGMENTS,
    heightAt: groundAt,
    patch: newPatch(),
    composedKey: "",
  };
  const overviewLayer: GroundLayer = {
    id: "overview",
    zoom: overviewImageryZoom,
    halfExtentM: overviewHalfExtentM,
    cellM: (2 * overviewHalfExtentM) / SEGMENTS,
    heightAt: (e, n) => overviewHeight(e, n) ?? chaseHeight(e, n),
    patch: newPatch(),
    composedKey: "",
  };

  // Where the rider is and how steeply the camera must look down to see them, for every frame.
  const centers = flight.map((f) => frame.toLocal(f.lat, f.lon));
  const riders = flight.map(
    (f, i) => groundAt(centers[i]?.e ?? 0, centers[i]?.n ?? 0) ?? f.metrics.altitude ?? 0,
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
        terrainY: (x, z) => ((groundAt(c.e + x, c.n - z) ?? rider) - rider) * EXAGGERATION,
      });
    }),
    PITCH_EASE_FRAMES,
  );

  // Cameras in the meters of the whole flight: x east, y up (stretched like the relief), z south.
  const lastIndex = flight.length - 1;
  const chaseParams = (i: number): CameraParams => ({
    target: {
      x: centers[i]?.e ?? 0,
      y: (riders[i] ?? 0) * EXAGGERATION + MARKER_LIFT_M,
      z: -(centers[i]?.n ?? 0),
    },
    bearingRad: flight[i]?.bearingRad ?? 0,
    distanceM: CAMERA_DISTANCE_M[options.orientation],
    pitchRad: pitches[i] ?? PITCH_RAD,
  });
  const overviewBase =
    overviewLayer.heightAt(overview.center.e, overview.center.n) ??
    flight[Math.floor(flight.length / 2)]?.metrics.altitude ??
    0;
  const overviewParams: CameraParams = {
    target: { x: overview.center.e, y: overviewBase * EXAGGERATION, z: -overview.center.n },
    bearingRad: overview.bearingRad,
    distanceM: overview.distanceM,
    pitchRad: OVERVIEW_PITCH_RAD,
  };
  const overviewView: LayerView = {
    center: overview.center,
    baseHeightM: overviewBase,
    origin: overviewOrigin,
  };

  const credit = [
    imagery.size > 0 ? plainAttribution(options.tiles.attribution) : "",
    chaseTerrainLoaded.size + overviewTerrainLoaded.size > 0 ? options.terrain.attribution : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const footer = { title: options.title, dateText: options.dateText, credit };

  // The layer whose patch is now the ground picture in the renderer.
  let uploaded = "";

  function setGroundPicture(layer: GroundLayer, view: LayerView): void {
    const key = `${view.origin.x}/${view.origin.y}`;
    if (layer.composedKey !== key) {
      if (layer.patch.ctx) {
        composePatch(layer.patch.ctx, view.origin, layer.zoom, imagery, GROUND_BACKGROUND);
      }
      layer.composedKey = key;
      if (uploaded === layer.id) uploaded = "";
    }
    if (uploaded !== layer.id) {
      gpu.setGroundTexture(layer.patch.canvas);
      uploaded = layer.id;
    }
  }

  /** Draws one layer as seen by a camera, and gives the way to find a point of the world in it. */
  function drawLayer(
    layer: GroundLayer,
    view: LayerView,
    camera: CameraParams,
    routeDistanceM: number,
    ctx: CanvasRenderingContext2D,
    alpha: number,
  ): (world: Vec3) => { x: number; y: number; visible: boolean } {
    const baseU = view.baseHeightM * EXAGGERATION;
    const toScene = (v: Vec3): Vec3 => ({
      x: v.x - view.center.e,
      y: v.y - baseU,
      z: v.z + view.center.n,
    });

    const eyeWorld = chaseCamera({
      target: camera.target,
      bearingRad: camera.bearingRad,
      distanceM: camera.distanceM,
      pitchRad: camera.pitchRad,
      minHeightM: -Infinity,
    }).eye;
    // Not into the ground, wherever the camera has been taken.
    const below = groundAt(eyeWorld.x, -eyeWorld.z);
    const eye = toScene({
      ...eyeWorld,
      y:
        below === null
          ? eyeWorld.y
          : Math.max(eyeWorld.y, below * EXAGGERATION + CAMERA_CLEARANCE_M),
    });
    const target = toScene(camera.target);

    const origin = view.origin;
    const mesh = buildTerrainMesh({
      segments: SEGMENTS,
      cellM: layer.cellM,
      center: view.center,
      heightAt: layer.heightAt,
      fallbackHeight: view.baseHeightM,
      baseHeight: view.baseHeightM,
      exaggeration: EXAGGERATION,
      uvAt: (e, n) => {
        const [tx, ty] = frame.tileCoords(e, n, layer.zoom);
        return patchUv(origin, tx, ty);
      },
      sun: SUN,
    });

    const points: Vec3[] = [];
    const finished: boolean[] = [];
    for (const point of route) {
      if (
        Math.abs(point.e - view.center.e) > layer.halfExtentM ||
        Math.abs(point.n - view.center.n) > layer.halfExtentM
      ) {
        continue;
      }
      const x = point.e - view.center.e;
      const z = view.center.n - point.n;
      // On the surface that is drawn, so the ribbon is not hidden by the ground around it.
      const y = surfaceY(mesh, x, z);
      if (y === null) continue;
      points.push({ x, y, z });
      finished.push(point.distanceM <= routeDistanceM);
    }
    const ribbon: Ribbon = buildRibbon(points, finished, {
      halfWidthM: Math.max(RIBBON_MIN_HALF_WIDTH_M, camera.distanceM * RIBBON_WIDTH_PER_DISTANCE),
      liftM: RIBBON_LIFT_M,
      maxGapM: RIBBON_MAX_GAP_M,
      colors: RIBBON_COLORS,
    });

    const near = Math.min(500, Math.max(10, camera.distanceM * 0.01));
    const far = Math.max(layer.halfExtentM * 4, camera.distanceM * 4);
    const viewProjection = multiply(
      shiftView(1 - 2 * RIDER_SCREEN_Y[options.orientation]),
      multiply(perspective(FOV_RAD, aspect, near, far), lookAt(eye, target)),
    );

    setGroundPicture(layer, view);
    gpu.draw({
      mesh,
      ribbon,
      viewProjection,
      eye,
      fogNear: Math.max(layer.halfExtentM * 0.55, camera.distanceM * 1.3),
      fogFar: Math.max(layer.halfExtentM * 1.1, camera.distanceM * 3),
      haze: HAZE,
    });

    ctx.globalAlpha = alpha;
    ctx.drawImage(glCanvas, 0, 0, size.width, size.height);
    ctx.globalAlpha = 1;
    return (world) => projectPoint(viewProjection, toScene(world));
  }

  /** The camera of a frame: the overview, coming down to the start, along the route, or going back up. */
  function cameraAt(phase: Phase): CameraParams {
    if (phase.kind === "intro") {
      return lerpCameraParams(overviewParams, chaseParams(0), ease(phase.t));
    }
    if (phase.kind === "outro") {
      return lerpCameraParams(chaseParams(lastIndex), overviewParams, ease(phase.t));
    }
    return chaseParams(phase.index);
  }

  const toLoad = (tiles: TileKey[]) => tiles.length;
  return {
    frameCount: total,
    size,
    info: {
      imageryZoom: chaseLayer.zoom,
      overviewImageryZoom: overviewLayer.zoom,
      imageryRequested: toLoad(imageryTiles),
      imageryLoaded: imagery.size,
      terrainZoom: chaseTerrainPlan?.zoom ?? 0,
      overviewTerrainZoom: overviewTerrainPlan?.zoom ?? 0,
      terrainRequested: toLoad(chaseTerrainTiles) + toLoad(overviewTerrainTiles),
      terrainLoaded: chaseTerrainLoaded.size + overviewTerrainLoaded.size,
    },

    renderFrame(k, ctx) {
      const phase = phaseAt(timeline, k);
      const weights = crossfade(phase);
      const index = phase.kind === "intro" ? 0 : phase.kind === "outro" ? lastIndex : phase.index;
      const f = flight[index];
      if (!f) return;
      const camera = cameraAt(phase);
      // At the start nothing has been ridden yet; at the end, all of it.
      const rideDistanceM = f.distanceM;

      const chaseView: LayerView = {
        center: centers[index] ?? frame.toLocal(f.lat, f.lon),
        baseHeightM: riders[index] ?? 0,
        origin: patchOrigin(f.lat, f.lon, chaseLayer.zoom),
      };

      let locate: ReturnType<typeof drawLayer> | null = null;
      if (weights.overview > 0) {
        locate = drawLayer(overviewLayer, overviewView, camera, rideDistanceM, ctx, 1);
      }
      if (weights.chase > 0) {
        locate = drawLayer(
          chaseLayer,
          chaseView,
          camera,
          rideDistanceM,
          ctx,
          weights.overview > 0 ? weights.chase : 1,
        );
      }

      const rider = chaseParams(index).target;
      const at = locate?.(rider);
      if (at?.visible) {
        drawMarker(
          ctx,
          (at.x * 0.5 + 0.5) * size.width,
          (0.5 - at.y * 0.5) * size.height,
          size.width,
        );
      }
      drawHud(
        ctx,
        options.orientation,
        hudTiles(f, { units: options.units, t: options.t }),
        footer,
        total > 1 ? k / (total - 1) : 1,
      );
    },

    dispose() {
      gpu.dispose();
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
