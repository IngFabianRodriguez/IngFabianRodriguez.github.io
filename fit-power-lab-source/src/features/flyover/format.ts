/** The video is always one minute long, whatever the length of the ride. */
export const FLYOVER_SECONDS = 60;
export const FLYOVER_FPS = 30;
export const FLYOVER_FRAMES = FLYOVER_SECONDS * FLYOVER_FPS;

/** Four megabits a second: a minute of full HD video of about 30 MB, light enough to send from a phone. */
export const FLYOVER_BITRATE = 4_000_000;
