import { describe, expect, it } from "vitest";
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
} from "@/domain/flyover/camera";

const DEG = Math.PI / 180;

/** East, up and south, in meters: the axes the scene is built in. */
const origin = { x: 0, y: 100, z: 0 };

function viewProjection(bearingRad: number, aspect = 9 / 16) {
  const camera = chaseCamera({
    target: origin,
    bearingRad,
    distanceM: 800,
    pitchRad: 38 * DEG,
    minHeightM: 0,
  });
  return {
    camera,
    vp: multiply(perspective(50 * DEG, aspect, 10, 20_000), lookAt(camera.eye, camera.target)),
  };
}

describe("chaseCamera", () => {
  it("looks at the target from behind and above, at the distance and the pitch asked", () => {
    const { camera } = viewProjection(0);

    // Heading north, the camera is south of the target (positive z) and higher.
    expect(camera.eye.z).toBeGreaterThan(0);
    expect(camera.eye.x).toBeCloseTo(0, 6);
    expect(camera.eye.y).toBeCloseTo(100 + 800 * Math.sin(38 * DEG), 4);
    expect(camera.eye.z).toBeCloseTo(800 * Math.cos(38 * DEG), 4);
    expect(camera.target).toEqual(origin);
  });

  it("goes round with the bearing: heading east, the camera is to the west", () => {
    const { camera } = viewProjection(90 * DEG);

    expect(camera.eye.x).toBeCloseTo(-800 * Math.cos(38 * DEG), 4);
    expect(camera.eye.z).toBeCloseTo(0, 4);
  });

  it("never goes below a minimum height over the ground, keeping the same view direction as far as it can", () => {
    const camera = chaseCamera({
      target: origin,
      bearingRad: 0,
      distanceM: 800,
      pitchRad: 38 * DEG,
      minHeightM: 900,
    });

    expect(camera.eye.y).toBeGreaterThanOrEqual(900);
    expect(camera.target).toEqual(origin);
  });
});

describe("projectPoint", () => {
  it("puts the target at the center of the picture", () => {
    const { vp } = viewProjection(0);

    const p = projectPoint(vp, origin);

    expect(p.visible).toBe(true);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(0, 6);
  });

  it("puts what is ahead above the center and what is to the right on the right", () => {
    const { vp } = viewProjection(0);

    const ahead = projectPoint(vp, { x: 0, y: 100, z: -500 });
    const right = projectPoint(vp, { x: 100, y: 100, z: 0 });
    const left = projectPoint(vp, { x: -100, y: 100, z: 0 });

    expect(ahead.y).toBeGreaterThan(0.05);
    expect(ahead.x).toBeCloseTo(0, 6);
    expect(right.x).toBeGreaterThan(0);
    expect(left.x).toBeLessThan(0);
  });

  it("keeps the same picture, turned, when the bearing turns", () => {
    const north = projectPoint(viewProjection(0).vp, { x: 0, y: 100, z: -500 });
    const east = projectPoint(viewProjection(90 * DEG).vp, { x: 500, y: 100, z: 0 });

    expect(east.x).toBeCloseTo(north.x, 6);
    expect(east.y).toBeCloseTo(north.y, 6);
  });

  it("says a point behind the camera is not visible", () => {
    const { vp } = viewProjection(0);

    expect(projectPoint(vp, { x: 0, y: 100, z: 5000 }).visible).toBe(false);
  });

  it("gives a wider view to a wider picture", () => {
    const portrait = projectPoint(viewProjection(0, 9 / 16).vp, { x: 200, y: 100, z: 0 });
    const landscape = projectPoint(viewProjection(0, 16 / 9).vp, { x: 200, y: 100, z: 0 });

    expect(Math.abs(landscape.x)).toBeLessThan(Math.abs(portrait.x));
  });
});

describe("shiftView", () => {
  it("moves what the camera looks at up or down in the picture, without turning the view", () => {
    const { camera } = viewProjection(0);
    const view = lookAt(camera.eye, camera.target);
    const projection = perspective(50 * DEG, 9 / 16, 10, 20_000);
    const shifted = multiply(shiftView(-0.25), multiply(projection, view));

    const center = projectPoint(shifted, origin);
    const ahead = projectPoint(shifted, { x: 0, y: 100, z: -500 });
    const plain = projectPoint(multiply(projection, view), { x: 0, y: 100, z: -500 });

    expect(center.x).toBeCloseTo(0, 6);
    expect(center.y).toBeCloseTo(-0.25, 6);
    expect(ahead.y).toBeCloseTo(plain.y - 0.25, 6);
  });
});

describe("multiply", () => {
  it("leaves a matrix as it is when multiplied by the identity", () => {
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const m = lookAt({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 });

    // Compared number by number: a zero may come out as -0 on one side and +0 on the other.
    Array.from(multiply(identity, m)).forEach((value, i) =>
      expect(value).toBeCloseTo(m[i] ?? NaN, 6),
    );
  });
});

describe("clearPitch", () => {
  const base = {
    target: { x: 0, y: 6, z: 0 },
    bearingRad: 0,
    distanceM: 900,
    basePitchRad: 26 * DEG,
    maxPitchRad: 70 * DEG,
    marginM: 8,
  };

  it("keeps the usual pitch when nothing is in the way", () => {
    expect(clearPitch({ ...base, terrainY: () => 0 })).toBeCloseTo(26 * DEG, 6);
  });

  it("looks down more steeply when a hill stands between the camera and the rider", () => {
    // A ridge 260 m high across the road, 400 m behind the rider (south, positive z).
    const ridge = (_x: number, z: number) => (Math.abs(z - 400) < 60 ? 260 : 0);

    const pitch = clearPitch({ ...base, terrainY: ridge });

    expect(pitch).toBeGreaterThan(26 * DEG);
    // At that pitch the line of sight clears the ridge.
    const camera = chaseCamera({
      target: base.target,
      bearingRad: 0,
      distanceM: 900,
      pitchRad: pitch,
      minHeightM: -Infinity,
    });
    const t = 400 / camera.eye.z;
    expect(base.target.y + (camera.eye.y - base.target.y) * t).toBeGreaterThan(260 + 8 - 1e-6);
  });

  it("does not go past the steepest pitch allowed, even if the rider is buried", () => {
    expect(clearPitch({ ...base, terrainY: () => 10_000 })).toBeCloseTo(70 * DEG, 6);
  });

  it("looks along the bearing: a hill to the east does not matter when heading north", () => {
    const eastRidge = (x: number) => (x > 100 ? 500 : 0);

    expect(clearPitch({ ...base, terrainY: eastRidge })).toBeCloseTo(26 * DEG, 6);
  });
});

describe("smoothPitches", () => {
  it("never goes below what each frame needs, and changes gently", () => {
    const need = Array.from({ length: 100 }, (_, i) => (i === 50 ? 60 * DEG : 26 * DEG));

    const smooth = smoothPitches(need, 10);

    expect(smooth).toHaveLength(100);
    smooth.forEach((value, i) => expect(value).toBeGreaterThanOrEqual((need[i] ?? 0) - 1e-9));
    for (let i = 1; i < smooth.length; i++) {
      expect(Math.abs((smooth[i] ?? 0) - (smooth[i - 1] ?? 0))).toBeLessThan(6 * DEG);
    }
    // The change starts before the frame that needs it and ends after it.
    expect(smooth[45]).toBeGreaterThan(26 * DEG);
    expect(smooth[55]).toBeGreaterThan(26 * DEG);
    expect(smooth[0]).toBeCloseTo(26 * DEG, 6);
    expect(smooth[99]).toBeCloseTo(26 * DEG, 6);
  });

  it("leaves a steady pitch as it is", () => {
    for (const value of smoothPitches([0.5, 0.5, 0.5, 0.5], 2)) expect(value).toBeCloseTo(0.5, 9);
  });
});

describe("lerpCameraParams", () => {
  const a = {
    target: { x: 0, y: 100, z: 0 },
    bearingRad: 0,
    distanceM: 20_000,
    pitchRad: 55 * DEG,
  };
  const b = {
    target: { x: 1000, y: 300, z: -2000 },
    bearingRad: 90 * DEG,
    distanceM: 1_250,
    pitchRad: 30 * DEG,
  };

  it("is the first camera at 0 and the second at 1", () => {
    expect(lerpCameraParams(a, b, 0)).toEqual(a);
    const end = lerpCameraParams(a, b, 1);
    expect(end.target).toEqual(b.target);
    expect(end.bearingRad).toBeCloseTo(b.bearingRad, 9);
    expect(end.distanceM).toBeCloseTo(b.distanceM, 6);
    expect(end.pitchRad).toBeCloseTo(b.pitchRad, 9);
  });

  it("zooms by proportion, not by distance: half way is the geometric mean", () => {
    const middle = lerpCameraParams(a, b, 0.5);

    expect(middle.distanceM).toBeCloseTo(Math.sqrt(20_000 * 1_250), 4);
    expect(middle.target).toEqual({ x: 500, y: 200, z: -1000 });
    expect(middle.pitchRad).toBeCloseTo(42.5 * DEG, 9);
  });

  it("turns the short way round the circle", () => {
    const left = { ...a, bearingRad: 350 * DEG };
    const right = { ...a, bearingRad: 10 * DEG };

    const middle = lerpCameraParams(left, right, 0.5);

    expect(
      Math.abs(Math.atan2(Math.sin(middle.bearingRad), Math.cos(middle.bearingRad))),
    ).toBeLessThan(1e-9);
  });
});

describe("overviewCamera", () => {
  const options = {
    aspect: 9 / 16,
    fovRad: 55 * DEG,
    pitchRad: 55 * DEG,
    minDistanceM: 1_500,
    usableHeight: 0.6,
    margin: 1.25,
  };

  it("is centred on the middle of the route", () => {
    const view = overviewCamera({ minE: 1000, maxE: 3000, minN: -500, maxN: 5500 }, options);

    expect(view.center).toEqual({ e: 2000, n: 2500 });
  });

  it("puts the long side of the route along the height of the picture", () => {
    const tall = overviewCamera({ minE: 0, maxE: 2000, minN: 0, maxN: 9000 }, options);
    const wide = overviewCamera({ minE: 0, maxE: 9000, minN: 0, maxN: 2000 }, options);

    expect(tall.bearingRad).toBe(0);
    expect(wide.bearingRad).toBeCloseTo(90 * DEG, 9);
    // The same route turned, so the same distance.
    expect(wide.distanceM).toBeCloseTo(tall.distanceM, 6);
  });

  it("goes further for a bigger route, and has room around a small one", () => {
    const small = overviewCamera({ minE: 0, maxE: 500, minN: 0, maxN: 500 }, options);
    const medium = overviewCamera({ minE: 0, maxE: 5000, minN: 0, maxN: 8000 }, options);
    const big = overviewCamera({ minE: 0, maxE: 20_000, minN: 0, maxN: 40_000 }, options);

    expect(small.distanceM).toBe(1_500);
    expect(medium.distanceM).toBeGreaterThan(small.distanceM);
    expect(big.distanceM).toBeGreaterThan(medium.distanceM);
    expect(big.distanceM / medium.distanceM).toBeCloseTo(5, 0);
  });

  it("fits the whole route in the picture, in both directions", () => {
    const route = { minE: 0, maxE: 6000, minN: 0, maxN: 14_000 };
    const view = overviewCamera(route, options);
    const camera = chaseCamera({
      target: { x: view.center.e, y: 0, z: -view.center.n },
      bearingRad: view.bearingRad,
      distanceM: view.distanceM,
      pitchRad: options.pitchRad,
      minHeightM: -Infinity,
    });
    const vp = multiply(
      shiftView(1 - 2 * 0.62),
      multiply(
        perspective(options.fovRad, options.aspect, 100, 500_000),
        lookAt(camera.eye, camera.target),
      ),
    );

    for (const [e, n] of [
      [0, 0],
      [6000, 0],
      [0, 14_000],
      [6000, 14_000],
    ] as const) {
      const p = projectPoint(vp, { x: e, y: 0, z: -n });
      expect(Math.abs(p.x)).toBeLessThan(1);
      // Below the strip with the numbers, above the footer.
      expect(p.y).toBeGreaterThan(-0.9);
      expect(p.y).toBeLessThan(0.45);
    }
  });
});
