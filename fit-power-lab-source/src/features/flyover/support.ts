import { findH264Codec } from "@/features/flyover/encodeMp4";
import { FLYOVER_BITRATE, FLYOVER_FPS } from "@/features/flyover/format";
import { FRAME_SIZES } from "@/features/flyover/hud";

/** What the browser can do for the 3D video: everything, or what it lacks. */
export type FlyoverSupport = "ok" | "no-webgl" | "no-encoder";

interface SupportDeps {
  hasVideoEncoder(): boolean;
  hasWebGl2(): boolean;
  h264(): Promise<string | null>;
}

const browserDeps: SupportDeps = {
  hasVideoEncoder: () => typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined",
  hasWebGl2: () => {
    try {
      return document.createElement("canvas").getContext("webgl2") !== null;
    } catch {
      return false;
    }
  },
  h264: () => findH264Codec(FRAME_SIZES.vertical, FLYOVER_FPS, FLYOVER_BITRATE),
};

/** Checks, before anything is asked of a server, that the browser can draw and encode the video. */
export async function flyoverSupport(deps: SupportDeps = browserDeps): Promise<FlyoverSupport> {
  if (!deps.hasWebGl2()) return "no-webgl";
  if (!deps.hasVideoEncoder()) return "no-encoder";
  return (await deps.h264()) ? "ok" : "no-encoder";
}
