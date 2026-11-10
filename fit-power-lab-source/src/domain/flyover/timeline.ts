/** How a video is split: the opening, the flight along the route and the closing. */
export interface Timeline {
  total: number;
  /** Frames in which the camera comes down from the overview to the start of the route. */
  intro: number;
  /** Frames in which the rider goes along the whole route. */
  flight: number;
  /** Frames in which the camera goes back up to show the whole route. */
  outro: number;
}

const INTRO_SECONDS = 5;
const OUTRO_SECONDS = 6;
const INTRO_SHARE = 0.1;
const OUTRO_SHARE = 0.12;
/** A video shorter than this many frames is only the flight. */
const MIN_FRAMES_FOR_ENDS = 30;

/** The opening and the closing last a few seconds whatever the length of the video. */
export function buildTimeline(total: number, fps: number): Timeline {
  if (total < MIN_FRAMES_FOR_ENDS) return { total, intro: 0, flight: total, outro: 0 };
  const intro = Math.min(Math.round(total * INTRO_SHARE), Math.round(INTRO_SECONDS * fps));
  const outro = Math.min(Math.round(total * OUTRO_SHARE), Math.round(OUTRO_SECONDS * fps));
  return { total, intro, flight: total - intro - outro, outro };
}

export type Phase =
  { kind: "intro"; t: number } | { kind: "flight"; index: number } | { kind: "outro"; t: number };

/**
 * Where a frame is. In the opening `t` goes from 0 (the overview) towards 1 (the first frame of the
 * flight); in the closing it goes from just above 0 (the last frame of the flight) to 1 (the
 * overview).
 */
export function phaseAt(timeline: Timeline, frame: number): Phase {
  const { intro, flight, outro, total } = timeline;
  const k = Math.min(total - 1, Math.max(0, frame));
  if (k < intro) return { kind: "intro", t: k / intro };
  if (k < intro + flight) return { kind: "flight", index: k - intro };
  return { kind: "outro", t: (k - intro - flight + 1) / outro };
}

/** Starts and ends gently: a camera that speeds up and slows down instead of lurching. */
export function ease(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export interface Crossfade {
  /** How much of the picture comes from the map of the whole route, 0 to 1. */
  overview: number;
  /** How much comes from the detailed map around the rider; the two add up to 1. */
  chase: number;
}

/**
 * The map of the whole route and the detailed map around the rider are two different pictures of
 * the ground. Each is shown alone where it is good, and they are mixed over a short stretch of the
 * move between the two so that the change of detail is not a jump.
 */
export function crossfade(phase: Phase): Crossfade {
  if (phase.kind === "flight") return { overview: 0, chase: 1 };
  if (phase.kind === "intro") {
    const chase = ease((phase.t - 0.55) / 0.25);
    return { overview: 1 - chase, chase };
  }
  const overview = ease((phase.t - 0.2) / 0.25);
  return { overview, chase: 1 - overview };
}
