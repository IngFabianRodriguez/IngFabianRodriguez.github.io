import { useCallback, useRef, useState } from "react";
import type { KmRange } from "@/app/appState";
import type { AxisMap } from "@/domain/viz/axis";

/** What a Recharts mouse handler gives; only the index of the point under the pointer is used. */
export interface ChartMouseState {
  activeTooltipIndex?: unknown;
}

export interface Selection {
  x1: number;
  x2: number;
}

interface Options {
  /** The points the chart draws, to turn the index under the pointer into a horizontal value. */
  points: { x: number }[];
  axisMap: AxisMap;
  onCursorKm: (km: number | null) => void;
  onRange: (range: KmRange) => void;
}

const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

/**
 * Pointer behavior shared by every chart: moving over it sets the shared cursor (in km), leaving
 * clears it, and dragging selects a stretch that is given to `onRange` when released. It takes
 * callbacks, not the app state, so a chart does not redraw on every move of another one.
 */
export function useChartInteractions({ points, axisMap, onCursorKm, onRange }: Options) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const dragFrom = useRef<number | null>(null);
  const lastKm = useRef<number | null>(null);

  const xAt = useCallback(
    (state: ChartMouseState): number | undefined => {
      const raw = state.activeTooltipIndex;
      const index = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
      return Number.isInteger(index) ? points[index]?.x : undefined;
    },
    [points],
  );

  const sendCursor = useCallback(
    (km: number | null) => {
      if (lastKm.current === km) return;
      lastKm.current = km;
      onCursorKm(km);
    },
    [onCursorKm],
  );

  const onMouseMove = useCallback(
    (state: ChartMouseState) => {
      const x = xAt(state);
      if (x === undefined) return;
      sendCursor(round6(axisMap.toKm(x)));
      if (dragFrom.current !== null) setSelection({ x1: dragFrom.current, x2: x });
    },
    [axisMap, sendCursor, xAt],
  );

  const onMouseDown = useCallback(
    (state: ChartMouseState) => {
      const x = xAt(state);
      if (x === undefined) return;
      dragFrom.current = x;
      setSelection({ x1: x, x2: x });
    },
    [xAt],
  );

  const onMouseUp = useCallback(
    (state: ChartMouseState) => {
      const from = dragFrom.current;
      if (from === null) return;
      dragFrom.current = null;
      setSelection(null);
      const to = xAt(state);
      if (to === undefined || to === from) return;
      const [low, high] = from < to ? [from, to] : [to, from];
      onRange({ fromKm: axisMap.toKm(low), toKm: axisMap.toKm(high) });
    },
    [axisMap, onRange, xAt],
  );

  const onMouseLeave = useCallback(() => {
    dragFrom.current = null;
    setSelection(null);
    sendCursor(null);
  }, [sendCursor]);

  return { handlers: { onMouseMove, onMouseDown, onMouseUp, onMouseLeave }, selection };
}
