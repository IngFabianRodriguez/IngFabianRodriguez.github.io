import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeAxisMap } from "@/domain/viz/axis";
import { useChartInteractions } from "@/features/charts/useChartInteractions";
import { rideOf } from "@/test/rideOf";

/** Eleven points 10 m apart, one second apart: 0 to 0.1 km, 0 to 10 s. */
const ride = rideOf(
  Array.from({ length: 11 }, (_, t) => ({ t, distance: 10 * t, altitude: 0, speed: 10 })),
);
const points = ride.samples.map((s) => ({ x: s.distance / 1000 }));

function setup(axis: "distance" | "time" = "distance") {
  const onCursorKm = vi.fn();
  const onRange = vi.fn();
  const axisMap = makeAxisMap(ride, { axis, units: "metric" });
  const hook = renderHook(() =>
    useChartInteractions({
      points: axis === "time" ? points.map((p) => ({ x: (p.x * 1000) / 10 / 60 })) : points,
      axisMap,
      onCursorKm,
      onRange,
    }),
  );
  return { ...hook, onCursorKm, onRange };
}

describe("useChartInteractions", () => {
  it("sets the shared cursor, in km, at the point under the pointer", () => {
    const { result, onCursorKm } = setup();

    act(() => result.current.handlers.onMouseMove({ activeTooltipIndex: 4 }));

    expect(onCursorKm).toHaveBeenCalledWith(0.04);
  });

  it("converts the point to km when the axis is elapsed time", () => {
    const { result, onCursorKm } = setup("time");

    act(() => result.current.handlers.onMouseMove({ activeTooltipIndex: 4 }));

    expect(onCursorKm).toHaveBeenCalledWith(0.04);
  });

  it("does not repeat the cursor while the pointer stays on the same point", () => {
    const { result, onCursorKm } = setup();

    act(() => result.current.handlers.onMouseMove({ activeTooltipIndex: 4 }));
    act(() => result.current.handlers.onMouseMove({ activeTooltipIndex: 4 }));
    act(() => result.current.handlers.onMouseMove({ activeTooltipIndex: "5" }));

    expect(onCursorKm.mock.calls).toEqual([[0.04], [0.05]]);
  });

  it("ignores moves that are not over a point", () => {
    const { result, onCursorKm } = setup();

    act(() => result.current.handlers.onMouseMove({ activeTooltipIndex: undefined }));
    act(() => result.current.handlers.onMouseMove({ activeTooltipIndex: 99 }));

    expect(onCursorKm).not.toHaveBeenCalled();
  });

  it("clears the cursor when the pointer leaves", () => {
    const { result, onCursorKm } = setup();

    act(() => result.current.handlers.onMouseMove({ activeTooltipIndex: 4 }));
    act(() => result.current.handlers.onMouseLeave());

    expect(onCursorKm).toHaveBeenLastCalledWith(null);
  });

  it("selects the dragged stretch and gives it as a range in km when released", () => {
    const { result, onRange } = setup();

    act(() => result.current.handlers.onMouseDown({ activeTooltipIndex: 2 }));
    act(() => result.current.handlers.onMouseMove({ activeTooltipIndex: 6 }));
    expect(result.current.selection).toEqual({ x1: 0.02, x2: 0.06 });
    act(() => result.current.handlers.onMouseUp({ activeTooltipIndex: 6 }));

    expect(onRange).toHaveBeenCalledWith({ fromKm: 0.02, toKm: 0.06 });
    expect(result.current.selection).toBeNull();
  });

  it("gives the range in order when the drag goes right to left", () => {
    const { result, onRange } = setup();

    act(() => result.current.handlers.onMouseDown({ activeTooltipIndex: 8 }));
    act(() => result.current.handlers.onMouseUp({ activeTooltipIndex: 3 }));

    expect(onRange).toHaveBeenCalledWith({ fromKm: 0.03, toKm: 0.08 });
  });

  it("converts a range dragged on the time axis to km", () => {
    const { result, onRange } = setup("time");

    act(() => result.current.handlers.onMouseDown({ activeTooltipIndex: 2 }));
    act(() => result.current.handlers.onMouseUp({ activeTooltipIndex: 6 }));

    expect(onRange).toHaveBeenCalledTimes(1);
    const range = onRange.mock.calls[0]?.[0] as { fromKm: number; toKm: number };
    expect(range.fromKm).toBeCloseTo(0.02, 6);
    expect(range.toKm).toBeCloseTo(0.06, 6);
  });

  it("takes a click without a drag for no range", () => {
    const { result, onRange } = setup();

    act(() => result.current.handlers.onMouseDown({ activeTooltipIndex: 3 }));
    act(() => result.current.handlers.onMouseUp({ activeTooltipIndex: 3 }));

    expect(onRange).not.toHaveBeenCalled();
  });

  it("drops the selection when the pointer leaves the chart before it is released", () => {
    const { result, onRange } = setup();

    act(() => result.current.handlers.onMouseDown({ activeTooltipIndex: 2 }));
    act(() => result.current.handlers.onMouseLeave());
    act(() => result.current.handlers.onMouseUp({ activeTooltipIndex: 6 }));

    expect(result.current.selection).toBeNull();
    expect(onRange).not.toHaveBeenCalled();
  });
});
