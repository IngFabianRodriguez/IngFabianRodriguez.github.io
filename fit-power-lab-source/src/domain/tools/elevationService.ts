export interface Coordinate {
  lat: number;
  lon: number;
}

/** Given coordinates, the elevation in meters at each, in the same order. */
export type ElevationLookup = (points: Coordinate[]) => Promise<number[]>;

/**
 * The public elevation service (Open-Meteo, Copernicus digital elevation model, about 90 m
 * resolution). Using it sends coordinates of the route to a third party, so it is only called
 * after the user confirms; see `ToolsPanel`.
 */
export const ELEVATION_ENDPOINT = "https://api.open-meteo.com/v1/elevation";
/** The service answers at most this many coordinates per request. */
export const MAX_COORDINATES_PER_REQUEST = 100;
/** Coordinates are rounded to this many decimals (4 is about 11 m) before they leave the machine. */
export const COORDINATE_DECIMALS = 4;
const TIMEOUT_MS = 20_000;

export class ElevationServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ElevationServiceError";
  }
}

const round = (value: number) => Number(value.toFixed(COORDINATE_DECIMALS));

/**
 * Builds a lookup that asks the service in requests of at most 100 coordinates. `fetchFn` is
 * `fetch` unless a test gives another. No cookies or referrer are sent.
 */
export function createElevationLookup(fetchFn?: typeof fetch): ElevationLookup {
  return async (points) => {
    const doFetch = fetchFn ?? globalThis.fetch.bind(globalThis);
    const elevations: number[] = [];

    for (let start = 0; start < points.length; start += MAX_COORDINATES_PER_REQUEST) {
      const batch = points.slice(start, start + MAX_COORDINATES_PER_REQUEST);
      const query = new URLSearchParams({
        latitude: batch.map((p) => round(p.lat)).join(","),
        longitude: batch.map((p) => round(p.lon)).join(","),
      });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const response = await doFetch(`${ELEVATION_ENDPOINT}?${query.toString()}`, {
          credentials: "omit",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new ElevationServiceError(`The elevation service answered ${response.status}.`);
        }
        const body = (await response.json()) as { elevation?: unknown };
        const values = body.elevation;
        if (
          !Array.isArray(values) ||
          values.length !== batch.length ||
          !values.every((v) => typeof v === "number" && Number.isFinite(v))
        ) {
          throw new ElevationServiceError("The elevation service sent an unexpected answer.");
        }
        elevations.push(...(values as number[]));
      } catch (error) {
        if (error instanceof ElevationServiceError) throw error;
        throw new ElevationServiceError("The elevation service could not be reached.");
      } finally {
        clearTimeout(timer);
      }
    }
    return elevations;
  };
}
