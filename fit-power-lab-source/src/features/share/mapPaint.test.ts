import { describe, expect, it } from "vitest";
import { drawMapScene } from "@/features/share/mapPaint";
import type { MapScene } from "@/features/share/mapScene";
import { canvasRecorder } from "@/test/canvasRecorder";

const box = { x: 100, y: 50, width: 400, height: 300 };
const backdrop = { backdrop: true } as unknown as CanvasImageSource;
const line = Array.from({ length: 11 }, (_, i) => ({ x: 20 + i * 36, y: 150 }));
const scene: MapScene = { box, lines: [line], backdrop, attribution: "© Test maps" };

function names(calls: [string, ...unknown[]][], name: string) {
  return calls.filter((c) => c[0] === name);
}

describe("drawMapScene", () => {
  it("keeps everything inside the box of the scene", () => {
    const { ctx, calls } = canvasRecorder();

    drawMapScene(ctx, scene);

    expect(calls).toContainEqual(["rect", box.x, box.y, box.width, box.height]);
    expect(names(calls, "clip")).toHaveLength(1);
    expect(calls.findIndex((c) => c[0] === "clip")).toBeLessThan(
      calls.findIndex((c) => c[0] === "stroke"),
    );
    expect(calls).toContainEqual(["translate", box.x, box.y]);
    expect(names(calls, "save")).toHaveLength(names(calls, "restore").length);
  });

  it("draws the backdrop first, over the whole box", () => {
    const { ctx, calls } = canvasRecorder();

    drawMapScene(ctx, scene);

    expect(calls).toContainEqual(["drawImage", backdrop, 0, 0, box.width, box.height]);
    expect(calls.findIndex((c) => c[0] === "drawImage")).toBeLessThan(
      calls.findIndex((c) => c[0] === "stroke"),
    );
  });

  it("fills the box with a plain colour when there is no backdrop", () => {
    const { ctx, calls } = canvasRecorder();

    drawMapScene(ctx, { ...scene, backdrop: null, attribution: "" });

    expect(names(calls, "drawImage")).toHaveLength(0);
    expect(calls).toContainEqual(["fillRect", 0, 0, box.width, box.height]);
  });

  it("draws the whole route, with a mark at its start and at its end", () => {
    const { ctx, calls } = canvasRecorder();

    drawMapScene(ctx, scene);

    expect(names(calls, "lineTo")).toHaveLength(2 * 10);
    expect(names(calls, "arc").map((c) => [c[1], c[2]])).toEqual([
      [20, 150],
      [380, 150],
    ]);
  });

  it("credits the tile server in a corner, only when there is something to credit", () => {
    const withCredit = canvasRecorder();
    const without = canvasRecorder();

    drawMapScene(withCredit.ctx, scene);
    drawMapScene(without.ctx, { ...scene, attribution: "" });

    expect(names(withCredit.calls, "fillText").map((c) => c[1])).toEqual(["© Test maps"]);
    expect(names(without.calls, "fillText")).toHaveLength(0);
  });

  it("draws no route for a scene without lines", () => {
    const { ctx, calls } = canvasRecorder();

    drawMapScene(ctx, { ...scene, lines: [] });

    expect(names(calls, "stroke")).toHaveLength(0);
    expect(names(calls, "arc")).toHaveLength(0);
  });
});
