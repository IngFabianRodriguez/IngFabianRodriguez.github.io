import { groundMetersPerTile, tileCoords } from "@/domain/viz/mercator";

const EARTH_RADIUS_M = 6_378_137;

const mercatorY = (latRad: number) => Math.log(Math.tan(Math.PI / 4 + latRad / 2));

/**
 * Meters east and north of a reference position, on the Web Mercator map scaled to the ground at
 * that position. A point of this frame and the tile that holds it are related by a plain
 * proportion, so imagery and terrain tiles of any zoom line up exactly.
 */
export class LocalFrame {
  private readonly lat0Rad: number;
  private readonly lon0Rad: number;
  private readonly y0: number;
  /** Ground meters for each meter of the Mercator map at the reference latitude. */
  private readonly scale: number;
  private readonly origins = new Map<number, [number, number]>();

  constructor(
    readonly lat0: number,
    readonly lon0: number,
  ) {
    this.lat0Rad = (lat0 * Math.PI) / 180;
    this.lon0Rad = (lon0 * Math.PI) / 180;
    this.y0 = mercatorY(this.lat0Rad);
    this.scale = Math.cos(this.lat0Rad) * EARTH_RADIUS_M;
  }

  toLocal(lat: number, lon: number): { e: number; n: number } {
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    return {
      e: (lonRad - this.lon0Rad) * this.scale,
      n: (mercatorY(latRad) - this.y0) * this.scale,
    };
  }

  toLatLon(e: number, n: number): [number, number] {
    const lonRad = this.lon0Rad + e / this.scale;
    const latRad = 2 * Math.atan(Math.exp(this.y0 + n / this.scale)) - Math.PI / 2;
    return [(latRad * 180) / Math.PI, (lonRad * 180) / Math.PI];
  }

  metersPerTile(zoom: number): number {
    return groundMetersPerTile(this.lat0, zoom);
  }

  /** Position in tile units of a zoom of a point of this frame. */
  tileCoords(e: number, n: number, zoom: number): [number, number] {
    let origin = this.origins.get(zoom);
    if (!origin) {
      origin = tileCoords(this.lat0, this.lon0, zoom);
      this.origins.set(zoom, origin);
    }
    const meters = this.metersPerTile(zoom);
    return [origin[0] + e / meters, origin[1] - n / meters];
  }
}
