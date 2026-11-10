import type { Ride } from "@/domain/ride";

/**
 * Indices (both included) of the first and last sample that may be drawn once `hideEndsM` meters
 * are hidden at each end of the route, measured on the cumulative distance. Null when nothing is
 * left to draw. The start and the end of a ride are where people live and work, so everything
 * that draws or shares a route goes through this.
 */
export function visibleRange(ride: Ride, hideEndsM: number): [number, number] | null {
  const { samples } = ride;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return null;

  const hide = Math.max(0, hideEndsM);
  const from = first.distance + hide;
  const to = last.distance - hide;

  let start = -1;
  let end = -1;
  samples.forEach((sample, i) => {
    if (sample.distance < from || sample.distance > to) return;
    if (start < 0) start = i;
    end = i;
  });
  return start < 0 ? null : [start, end];
}
