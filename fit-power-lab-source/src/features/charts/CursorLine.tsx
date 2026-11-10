import { ReferenceLine } from "recharts";
import { useAppState } from "@/app/AppContext";
import type { AxisMap } from "@/domain/viz/axis";

/**
 * The shared cursor on a chart: a vertical line where the pointer is on any chart or the map.
 * It reads the app state itself, so the chart around it does not redraw when the cursor moves.
 */
export function CursorLine({ axisMap, domain }: { axisMap: AxisMap; domain: [number, number] }) {
  const { cursorKm } = useAppState();
  if (cursorKm === null) return null;

  const x = axisMap.toX(cursorKm);
  if (x < domain[0] || x > domain[1]) return null;
  return <ReferenceLine x={x} stroke="var(--foreground)" strokeWidth={1.5} ifOverflow="hidden" />;
}
