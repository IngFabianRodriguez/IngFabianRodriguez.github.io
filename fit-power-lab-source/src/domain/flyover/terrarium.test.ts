import { describe, expect, it } from "vitest";
import { decodeTerrarium, ElevationField, TERRARIUM_SIZE } from "@/domain/flyover/terrarium";
import { tileCoords } from "@/domain/viz/mercator";

/** RGBA bytes of a tile whose every pixel has the given Terrarium color. */
function solid(r: number, g: number, b: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(TERRARIUM_SIZE * TERRARIUM_SIZE * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = r;
    rgba[i + 1] = g;
    rgba[i + 2] = b;
    rgba[i + 3] = 255;
  }
  return rgba;
}

describe("decodeTerrarium", () => {
  it("reads the height in meters from the red, green and blue channels", () => {
    // (R * 256 + G + B / 256) - 32768
    expect(decodeTerrarium(solid(128, 25, 0))[0]).toBe(25);
    expect(decodeTerrarium(solid(128, 0, 0))[0]).toBe(0);
    expect(decodeTerrarium(solid(129, 44, 128))[0]).toBeCloseTo(300.5, 5);
  });

  it("reads depths below sea level as negative heights", () => {
    expect(decodeTerrarium(solid(127, 255, 128))[0]).toBeCloseTo(-0.5, 5);
  });

  it("gives one height for each pixel, row by row", () => {
    const rgba = solid(128, 0, 0);
    // The pixel at column 3 of row 2 is 10 m.
    const at = (2 * TERRARIUM_SIZE + 3) * 4;
    rgba[at + 1] = 10;

    const heights = decodeTerrarium(rgba);

    expect(heights).toHaveLength(TERRARIUM_SIZE * TERRARIUM_SIZE);
    expect(heights[2 * TERRARIUM_SIZE + 3]).toBe(10);
    expect(heights[2 * TERRARIUM_SIZE + 4]).toBe(0);
  });
});

/** A tile whose height is the column of the pixel plus an offset: a slope toward the east. */
function ramp(offset: number): Float32Array {
  const heights = new Float32Array(TERRARIUM_SIZE * TERRARIUM_SIZE);
  for (let y = 0; y < TERRARIUM_SIZE; y++) {
    for (let x = 0; x < TERRARIUM_SIZE; x++) heights[y * TERRARIUM_SIZE + x] = offset + x;
  }
  return heights;
}

describe("ElevationField", () => {
  it("has no height where no tile was added", () => {
    const field = new ElevationField(3);

    expect(field.heightAtTile(2.5, 4.5)).toBeNull();
    field.addTile(2, 4, ramp(0));
    expect(field.has(2, 4)).toBe(true);
    expect(field.has(3, 4)).toBe(false);
    expect(field.heightAtTile(3.5, 4.5)).toBeNull();
  });

  it("reads the height at the center of a pixel exactly, and in between by proportion", () => {
    const field = new ElevationField(3);
    field.addTile(2, 4, ramp(100));

    // Pixel 127 spans 127/256..128/256 of the tile; its center is at 127.5/256.
    expect(field.heightAtTile(2 + 127.5 / 256, 4.5)).toBeCloseTo(100 + 127, 4);
    expect(field.heightAtTile(2 + 128 / 256, 4.5)).toBeCloseTo(100 + 127.5, 4);
  });

  it("goes smoothly across the border between two tiles", () => {
    const field = new ElevationField(3);
    field.addTile(2, 4, ramp(0));
    field.addTile(3, 4, ramp(256));

    // The border is half way between pixel 255 of one tile (255) and pixel 0 of the next (256).
    expect(field.heightAtTile(3, 4.5)).toBeCloseTo(255.5, 4);
    expect(field.heightAtTile(3 + 0.5 / 256, 4.5)).toBeCloseTo(256, 4);
  });

  it("uses the pixels it has at the edge of a tile whose neighbour is missing", () => {
    const field = new ElevationField(3);
    field.addTile(2, 4, ramp(0));

    // Beyond the last pixel center there is no neighbour: the last height holds.
    expect(field.heightAtTile(3 - 0.1 / 256, 4.5)).toBeCloseTo(255, 4);
  });

  it("wraps around the world in longitude", () => {
    const field = new ElevationField(2);
    field.addTile(3, 1, ramp(0));
    field.addTile(0, 1, ramp(256));

    // East of tile 3 comes tile 0.
    expect(field.heightAtTile(4, 1.5)).toBeCloseTo(255.5, 4);
  });

  it("reads a height by latitude and longitude", () => {
    const field = new ElevationField(0);
    field.addTile(0, 0, ramp(0));
    const [tx, ty] = tileCoords(0, 0, 0);
    expect([tx, ty]).toEqual([0.5, 0.5]);

    expect(field.heightAt(0, 0)).toBeCloseTo(127.5, 4);
    expect(field.heightAt(0, -90)).toBeCloseTo(63.5, 4);
  });

  it("keeps the same height in a flat area", () => {
    const field = new ElevationField(5);
    field.addTile(10, 12, new Float32Array(TERRARIUM_SIZE * TERRARIUM_SIZE).fill(1234));

    for (const [dx, dy] of [
      [0.1, 0.1],
      [0.5, 0.9],
      [0.99, 0.01],
    ] as const) {
      expect(field.heightAtTile(10 + dx, 12 + dy)).toBeCloseTo(1234, 4);
    }
  });
});
