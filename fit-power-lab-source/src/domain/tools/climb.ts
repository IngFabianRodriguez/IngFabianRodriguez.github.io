/**
 * Total climb and descent of a series of altitudes, in meters. A change only counts once it is at
 * least `deadbandM` away from the last level that was counted, so the small jitter of a barometric
 * sensor does not add up to meters of fake climbing.
 */
export function elevationChange(
  altitudes: number[],
  deadbandM = 1,
): { ascent: number; descent: number } {
  let level = altitudes[0];
  let ascent = 0;
  let descent = 0;
  if (level === undefined) return { ascent, descent };

  for (const altitude of altitudes) {
    if (altitude - level >= deadbandM) {
      ascent += altitude - level;
      level = altitude;
    } else if (level - altitude >= deadbandM) {
      descent += level - altitude;
      level = altitude;
    }
  }
  return { ascent, descent };
}
