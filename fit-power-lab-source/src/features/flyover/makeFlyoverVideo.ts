import { encodeMp4 } from "@/features/flyover/encodeMp4";
import { NoRouteError } from "@/features/flyover/errors";
import {
  FLYOVER_FPS,
  flyoverBitrate,
  flyoverFrames,
  type FlyoverMinutes,
} from "@/features/flyover/format";
import { createFlyoverSession, type SessionOptions } from "@/features/flyover/flyoverSession";

export { NoRouteError };

export interface MakeVideoDeps {
  createSession: typeof createFlyoverSession;
  encode: typeof encodeMp4;
  createCanvas(width: number, height: number): HTMLCanvasElement;
}

const browserDeps: MakeVideoDeps = {
  createSession: createFlyoverSession,
  encode: encodeMp4,
  createCanvas: (width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  },
};

export interface MakeVideoOptions extends Omit<
  SessionOptions,
  "onTilesProgress" | "frames" | "deps"
> {
  /** How long the video is, in minutes. */
  minutes: FlyoverMinutes;
  /** First the tiles are loaded, then the video is made; each reports from 0 to 1. */
  onProgress?: (stage: "tiles" | "video", progress: number) => void;
}

/**
 * Makes the one-minute 3D flight over a ride and gives it as the bytes of an MP4 file. Throws
 * `NoRouteError` when the ride has no route to fly over, and an `AbortError` when cancelled.
 */
export async function makeFlyoverVideo(
  options: MakeVideoOptions,
  deps: MakeVideoDeps = browserDeps,
): Promise<Uint8Array> {
  const { onProgress, minutes, ...sessionOptions } = options;
  const session = await deps.createSession({
    ...sessionOptions,
    frames: flyoverFrames(minutes),
    onTilesProgress: (progress) => onProgress?.("tiles", progress),
  });
  if (!session) throw new NoRouteError();

  try {
    const canvas = deps.createCanvas(session.size.width, session.size.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("The browser has no 2D canvas.");
    return await deps.encode({
      canvas,
      size: session.size,
      fps: FLYOVER_FPS,
      frames: session.frameCount,
      bitrate: flyoverBitrate(minutes),
      drawFrame: (k) => session.renderFrame(k, ctx),
      onProgress: (progress) => onProgress?.("video", progress),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } finally {
    session.dispose();
  }
}
