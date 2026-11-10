import type { Pt } from "@/domain/viz/miniRoute";
import type { MapScene } from "@/features/share/mapScene";

const PANEL = "#1e293b";
const ROUTE = "#38bdf8";
const CASING = "#ffffff";
const START = "#22c55e";
const END = "#ef4444";
const CREDIT_BAR = "rgba(255, 255, 255, 0.75)";
const CREDIT_TEXT = "#334155";

function strokeLine(ctx: CanvasRenderingContext2D, line: Pt[]): void {
  ctx.beginPath();
  line.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
}

function strokeAll(ctx: CanvasRenderingContext2D, lines: Pt[][], color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  for (const line of lines) if (line.length > 1) strokeLine(ctx, line);
}

function dot(ctx: CanvasRenderingContext2D, p: Pt, color: string, radius: number): void {
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = CASING;
  ctx.stroke();
}

/** Draws the map of a scene — background, route and credit — clipped to the box of the scene. */
export function drawMapScene(ctx: CanvasRenderingContext2D, scene: MapScene): void {
  const { box, lines, backdrop } = scene;

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();
  ctx.translate(box.x, box.y);

  if (backdrop) {
    ctx.drawImage(backdrop, 0, 0, box.width, box.height);
  } else {
    ctx.fillStyle = PANEL;
    ctx.fillRect(0, 0, box.width, box.height);
  }

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const first = lines[0]?.[0];
  const lastLine = lines[lines.length - 1];
  const last = lastLine?.[lastLine.length - 1];
  if (first && last) {
    strokeAll(ctx, lines, CASING, 9);
    strokeAll(ctx, lines, ROUTE, 5);
    dot(ctx, first, START, 8);
    dot(ctx, last, END, 8);
  }

  if (scene.attribution) {
    ctx.font = "400 11px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = CREDIT_BAR;
    ctx.fillRect(box.width - 200, box.height - 18, 200, 18);
    ctx.fillStyle = CREDIT_TEXT;
    ctx.fillText(scene.attribution, box.width - 6, box.height - 5, 190);
    ctx.textAlign = "left";
  }

  ctx.restore();
}
