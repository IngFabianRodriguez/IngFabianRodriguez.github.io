import { describe, expect, it, vi } from "vitest";
import {
  buildTerrainMesh,
  meshIndices,
  surfaceY,
  type MeshOptions,
} from "@/domain/flyover/terrainMesh";

const SEGMENTS = 8;
const CELL = 10;

function options(over: Partial<MeshOptions> = {}): MeshOptions {
  return {
    segments: SEGMENTS,
    cellM: CELL,
    center: { e: 0, n: 0 },
    heightAt: () => 100,
    fallbackHeight: 100,
    baseHeight: 100,
    exaggeration: 1,
    uvAt: (e, n) => [e / 1000, n / 1000],
    // From the west, 45 degrees up.
    sun: { x: -0.7071, y: 0.7071, z: 0 },
    ...over,
  };
}

const vertexCount = (SEGMENTS + 1) ** 2;

describe("buildTerrainMesh", () => {
  it("has a vertex at each corner of a grid of cells, with the rider in the middle", () => {
    const mesh = buildTerrainMesh(options());

    expect(mesh.positions).toHaveLength(vertexCount * 3);
    expect(mesh.uvs).toHaveLength(vertexCount * 2);
    expect(mesh.shade).toHaveLength(vertexCount);
    const middle = (SEGMENTS / 2) * (SEGMENTS + 1) + SEGMENTS / 2;
    expect([mesh.positions[middle * 3], mesh.positions[middle * 3 + 2]]).toEqual([0, 0]);
    // East is to the right and north is away from the camera (negative z).
    expect(mesh.positions[1 * 3]).toBeGreaterThan(mesh.positions[0] ?? 0);
    expect(mesh.positions[(SEGMENTS + 1) * 3 + 2]).toBeLessThan(mesh.positions[2] ?? 0);
  });

  it("is flat and evenly lit over flat ground", () => {
    const mesh = buildTerrainMesh(options());

    for (let i = 0; i < vertexCount; i++) {
      expect(mesh.positions[i * 3 + 1]).toBeCloseTo(0, 6);
      expect(mesh.shade[i]).toBeCloseTo(1, 4);
    }
  });

  it("measures heights from the height of the rider, and stretches them", () => {
    const mesh = buildTerrainMesh(options({ heightAt: () => 150, exaggeration: 2 }));

    expect(mesh.positions[1]).toBeCloseTo(100, 4);
  });

  it("lights a slope that faces the sun and darkens one that faces away", () => {
    // Ground rising to the east faces west, where the sun is.
    const risingEast = buildTerrainMesh(options({ heightAt: (e) => 100 + 0.5 * e }));
    // Ground rising to the west faces east, away from the sun.
    const risingWest = buildTerrainMesh(options({ heightAt: (e) => 100 - 0.5 * e }));
    const middle = (SEGMENTS / 2) * (SEGMENTS + 1) + SEGMENTS / 2;

    expect(risingEast.shade[middle]).toBeGreaterThan(1.1);
    expect(risingWest.shade[middle]).toBeLessThan(0.9);
    for (const mesh of [risingEast, risingWest]) {
      for (const value of mesh.shade) {
        expect(value).toBeGreaterThanOrEqual(0.55);
        expect(value).toBeLessThanOrEqual(1.35);
      }
    }
  });

  it("keeps the vertices on a fixed grid of the ground while the rider moves, so the relief does not swim", () => {
    const at = (e: number, n: number) => buildTerrainMesh(options({ center: { e, n } }));

    for (const [e, n] of [
      [123.4, -57.9],
      [123.4 + 3, -57.9 + 4],
    ] as const) {
      const mesh = at(e, n);
      for (let i = 0; i < vertexCount; i++) {
        const worldE = (mesh.positions[i * 3] ?? 0) + e;
        const worldN = -(mesh.positions[i * 3 + 2] ?? 0) + n;
        expect(worldE / CELL).toBeCloseTo(Math.round(worldE / CELL), 6);
        expect(worldN / CELL).toBeCloseTo(Math.round(worldN / CELL), 6);
      }
    }
  });

  it("uses the height of the ground where there is none known", () => {
    const mesh = buildTerrainMesh(
      options({ heightAt: (e) => (e < 0 ? null : 100), fallbackHeight: 130 }),
    );

    expect(mesh.positions[1]).toBeCloseTo(30, 4);
    const last = SEGMENTS;
    expect(mesh.positions[last * 3 + 1]).toBeCloseTo(0, 4);
  });

  it("asks the height of the ground and the texture position once for each vertex", () => {
    const heightAt = vi.fn(() => 100);
    const uvAt = vi.fn((): [number, number] => [0, 0]);

    buildTerrainMesh(options({ heightAt, uvAt }));

    expect(heightAt).toHaveBeenCalledTimes(vertexCount);
    expect(uvAt).toHaveBeenCalledTimes(vertexCount);
  });
});

describe("meshIndices", () => {
  it("has two triangles for each cell, all pointing up", () => {
    const indices = meshIndices(SEGMENTS);
    const mesh = buildTerrainMesh(options({ heightAt: () => 100 }));

    expect(indices).toHaveLength(SEGMENTS * SEGMENTS * 6);
    expect(Math.max(...indices)).toBeLessThan(vertexCount);
    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = [indices[i] ?? 0, indices[i + 1] ?? 0, indices[i + 2] ?? 0];
      const p = (k: number) => [
        mesh.positions[k * 3] ?? 0,
        mesh.positions[k * 3 + 1] ?? 0,
        mesh.positions[k * 3 + 2] ?? 0,
      ];
      const [pa, pb, pc] = [p(a), p(b), p(c)] as [number[], number[], number[]];
      const u = [pb[0]! - pa[0]!, pb[1]! - pa[1]!, pb[2]! - pa[2]!];
      const v = [pc[0]! - pa[0]!, pc[1]! - pa[1]!, pc[2]! - pa[2]!];
      // Counter-clockwise seen from above: the normal points up.
      const normalY = u[2]! * v[0]! - u[0]! * v[2]!;
      expect(normalY).toBeGreaterThan(0);
    }
  });
});

describe("surfaceY", () => {
  it("is the height of the ground where the mesh is flat, and the height of the vertex on a vertex", () => {
    const flat = buildTerrainMesh(options({ heightAt: () => 130, baseHeight: 100 }));

    expect(surfaceY(flat, 3.3, -7.7)).toBeCloseTo(30, 4);

    const ramp = buildTerrainMesh(options({ heightAt: (e) => 100 + e }));
    // The vertex at e = 20, n = 0 is 20 m high.
    expect(surfaceY(ramp, 20, 0)).toBeCloseTo(20, 4);
  });

  it("follows a slope in a straight line between vertices", () => {
    const ramp = buildTerrainMesh(options({ heightAt: (e, n) => 100 + 0.5 * e - 0.25 * n }));

    // z is to the south: n = -z.
    expect(surfaceY(ramp, 13.7, -6.2)).toBeCloseTo(0.5 * 13.7 - 0.25 * 6.2, 4);
  });

  it("is on the same triangles as the mesh that is drawn, not a smoother surface", () => {
    // Only the vertex at the north-east corner of one cell is raised.
    const bump = buildTerrainMesh(
      options({ heightAt: (e, n) => (e === 10 && n === 10 ? 110 : 100) }),
    );

    // The cell has its south-west corner at (0, 0): its diagonal goes from east to north, so the
    // centre of the cell lies on the line between the vertices at (10, 0) and (0, 10): 100 m.
    expect(surfaceY(bump, 5, -5)).toBeCloseTo(0, 4);
    // Near the raised corner the surface climbs to it.
    expect(surfaceY(bump, 9, -9)).toBeCloseTo(8, 4);
  });

  it("has no height outside the mesh", () => {
    const mesh = buildTerrainMesh(options());

    expect(surfaceY(mesh, SEGMENTS * CELL, 0)).toBeNull();
    expect(surfaceY(mesh, 0, -SEGMENTS * CELL)).toBeNull();
  });
});
