import { ReferenceArea, ReferenceLine } from "recharts";
import type { ChartStop } from "@/domain/viz/chartModel";

/**
 * Stops on a chart: a shaded band over the time spent standing still and a dashed line where it
 * began. On a distance axis a stop has no width, so the line is what shows.
 */
export function StopMarks({ stops }: { stops: ChartStop[] }) {
  return (
    <>
      {stops.map((stop, index) => (
        <g key={index}>
          {stop.x2 > stop.x1 ? (
            <ReferenceArea
              x1={stop.x1}
              x2={stop.x2}
              fill="var(--muted-foreground)"
              fillOpacity={0.18}
              stroke="none"
              ifOverflow="hidden"
            />
          ) : null}
          <ReferenceLine
            x={stop.x1}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 3"
            ifOverflow="hidden"
          />
        </g>
      ))}
    </>
  );
}
