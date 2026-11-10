export const FLYOVER_FPS = 30;

/** The lengths of video that can be asked for, in minutes. */
export const FLYOVER_DURATIONS = [1, 2, 3, 5] as const;
export type FlyoverMinutes = (typeof FLYOVER_DURATIONS)[number];
export const DEFAULT_FLYOVER_MINUTES: FlyoverMinutes = 1;

export const flyoverFrames = (minutes: number): number => minutes * 60 * FLYOVER_FPS;

/** Four megabits a second: a minute of full HD video of about 30 MB, light enough to send from a phone. */
export const FLYOVER_BITRATE = 4_000_000;

/**
 * The bitrate for a video of some length. Past two minutes it goes down a little, so that a five
 * minute video is about 110 MB and not 150: the file is built in the memory of the page.
 */
export function flyoverBitrate(minutes: number): number {
  return minutes <= 2 ? FLYOVER_BITRATE : 3_000_000;
}
