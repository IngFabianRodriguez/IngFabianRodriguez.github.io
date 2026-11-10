import type { Ride } from "@/domain/ride";

/** Power and heart rate are averaged over blocks this long (s), so the heart rate lag evens out. */
const BLOCK_S = 30;
/** A block needs this many pedalling samples with a heart rate to count. */
const MIN_BLOCK_SAMPLES = 20;
export const HR_FIT_MIN_BLOCKS = 8;
/** Below this spread of block powers (W, standard deviation) no relation can be read. */
const MIN_POWER_SD_W = 15;
/** A block this far (bpm) from the fit, or twice the usual scatter, is an outlier. */
const MIN_OUTLIER_BPM = 10;

export interface HrOutlier {
  fromKm: number;
  toKm: number;
  /** Mean of measured minus expected heart rate over the stretch (bpm); negative when below. */
  residualBpm: number;
  /** `hrHigh`: more effort than the power explains (headwind, climb, fatigue, heat...). */
  direction: "hrHigh" | "hrLow";
}

export interface PowerHeartRateFit {
  /** Beats per minute gained per watt. */
  slope: number;
  /** Heart rate at 0 W (bpm), the fit's intercept. */
  intercept: number;
  /** R2 of the fit over the blocks that are not outliers. */
  r2: number;
  /** Blocks of 30 s that took part. */
  blocks: number;
  outliers: HrOutlier[];
}

interface Block {
  index: number;
  power: number;
  hr: number;
  fromKm: number;
  toKm: number;
}

interface Line {
  slope: number;
  intercept: number;
}

function fitLine(blocks: Block[]): Line | null {
  const n = blocks.length;
  if (n < HR_FIT_MIN_BLOCKS) return null;
  const meanP = blocks.reduce((s, b) => s + b.power, 0) / n;
  const meanH = blocks.reduce((s, b) => s + b.hr, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (const b of blocks) {
    sxx += (b.power - meanP) ** 2;
    sxy += (b.power - meanP) * (b.hr - meanH);
  }
  if (Math.sqrt(sxx / n) < MIN_POWER_SD_W) return null;
  const slope = sxy / sxx;
  return { slope, intercept: meanH - slope * meanP };
}

const residual = (b: Block, line: Line) => b.hr - (line.intercept + line.slope * b.power);

/**
 * Learns the rider's own relation between power and heart rate: a straight line through the
 * 30-second averages of the pedalling samples that have a heart rate (0 means no signal). Blocks
 * far from the line are reported as outlier stretches, with the direction: heart rate far above
 * the line says the estimated power is low there (or the effort was harder than the power shows),
 * far below says it is high. The line is fitted again without the outliers.
 *
 * Null without a heart rate, with fewer than 8 blocks, or when the power hardly varies.
 */
export function powerHeartRateFit(ride: Ride, watts: number[]): PowerHeartRateFit | null {
  const groups = new Map<
    number,
    { power: number; hr: number; count: number; first: number; last: number }
  >();
  ride.samples.forEach((s, i) => {
    const power = watts[i] ?? 0;
    if (power <= 0 || s.heartRate === undefined || s.heartRate <= 0) return;
    const index = Math.floor(s.t / BLOCK_S);
    const g = groups.get(index) ?? {
      power: 0,
      hr: 0,
      count: 0,
      first: s.distance,
      last: s.distance,
    };
    g.power += power;
    g.hr += s.heartRate;
    g.count += 1;
    g.last = s.distance;
    groups.set(index, g);
  });

  const blocks: Block[] = [...groups.entries()]
    .filter(([, g]) => g.count >= MIN_BLOCK_SAMPLES)
    .map(([index, g]) => ({
      index,
      power: g.power / g.count,
      hr: g.hr / g.count,
      fromKm: g.first / 1000,
      toKm: g.last / 1000,
    }))
    .sort((a, b) => a.index - b.index);

  const first = fitLine(blocks);
  if (!first) return null;

  const scatter = Math.sqrt(
    blocks.reduce((s, b) => s + residual(b, first) ** 2, 0) / blocks.length,
  );
  const limit = Math.max(MIN_OUTLIER_BPM, 2 * scatter);
  const flagged = blocks.filter((b) => Math.abs(residual(b, first)) > limit);
  const kept = blocks.filter((b) => !flagged.includes(b));

  const refit = flagged.length > 0 ? fitLine(kept) : null;
  const line = refit ?? first;
  const used = refit ? kept : blocks;

  const meanH = used.reduce((s, b) => s + b.hr, 0) / used.length;
  const ssRes = used.reduce((s, b) => s + residual(b, line) ** 2, 0);
  const ssTot = used.reduce((s, b) => s + (b.hr - meanH) ** 2, 0);

  const outliers: HrOutlier[] = [];
  let open: { blocks: Block[]; direction: HrOutlier["direction"] } | null = null;
  const close = () => {
    if (!open) return;
    const [head] = open.blocks;
    const tail = open.blocks.at(-1);
    if (head && tail) {
      outliers.push({
        fromKm: head.fromKm,
        toKm: tail.toKm,
        residualBpm: open.blocks.reduce((s, b) => s + residual(b, line), 0) / open.blocks.length,
        direction: open.direction,
      });
    }
    open = null;
  };
  for (const b of flagged) {
    const r = residual(b, line);
    if (Math.abs(r) < MIN_OUTLIER_BPM) {
      close();
      continue;
    }
    const direction = r > 0 ? "hrHigh" : "hrLow";
    const last = open?.blocks.at(-1);
    if (open && last && open.direction === direction && b.index - last.index === 1) {
      open.blocks.push(b);
    } else {
      close();
      open = { blocks: [b], direction };
    }
  }
  close();

  return {
    slope: line.slope,
    intercept: line.intercept,
    r2: ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0,
    blocks: blocks.length,
    outliers,
  };
}
