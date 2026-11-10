const METERS_PER_DEGREE_LAT = 110_574;
const METERS_PER_DEGREE_LON_AT_EQUATOR = 111_320;

/**
 * Meters east and north of a reference point, on a flat approximation that is accurate for the
 * few tens of kilometers a ride covers.
 */
export function toLocalMeters(
  lat: number,
  lon: number,
  refLat: number,
  refLon: number,
): { x: number; y: number } {
  const east = METERS_PER_DEGREE_LON_AT_EQUATOR * Math.cos((refLat * Math.PI) / 180);
  return { x: (lon - refLon) * east, y: (lat - refLat) * METERS_PER_DEGREE_LAT };
}
