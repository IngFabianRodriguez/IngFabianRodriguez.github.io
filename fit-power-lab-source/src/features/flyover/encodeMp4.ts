import { Mp4EncodingUnsupportedError } from "@/features/flyover/errors";

export { Mp4EncodingUnsupportedError };

/** Codecs to try, from the most capable: H.264 High, Main and Baseline profiles at level 4.0. */
export const H264_CODECS = ["avc1.640028", "avc1.4d0028", "avc1.42E028"];

/** More frames than this waiting in the encoder means it is behind: the next ones wait. */
const MAX_QUEUED_FRAMES = 4;
/** A key frame every this many seconds, so a player can skip through the video. */
const KEY_FRAME_SECONDS = 2;
/** The browser gets a turn after this many frames, so the page can show progress and be cancelled. */
const FRAMES_PER_TURN = 3;

interface VideoSize {
  width: number;
  height: number;
}

interface EncoderInit {
  output(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata): void;
  error(error: Error): void;
}

interface FileWriter {
  addVideoChunk(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata): void;
  /** Closes the file and gives its bytes. */
  finalize(): Uint8Array;
}

/** The pieces of the browser the encoding needs, apart so that a test can stand in for them. */
export interface EncodeDeps {
  isConfigSupported(config: VideoEncoderConfig): Promise<{ supported?: boolean }>;
  createEncoder(init: EncoderInit): VideoEncoder;
  createFrame(canvas: HTMLCanvasElement, init: { timestamp: number; duration: number }): VideoFrame;
  createMuxer(size: VideoSize, fps: number): Promise<FileWriter>;
  /** Gives the browser a moment to do other things. */
  nextTurn(): Promise<void>;
}

export const browserDeps: EncodeDeps = {
  isConfigSupported: (config) => VideoEncoder.isConfigSupported(config),
  createEncoder: (init) => new VideoEncoder(init),
  createFrame: (canvas, init) => new VideoFrame(canvas, init),
  // Loaded when the first video is made, so the rest of the app does not carry it.
  createMuxer: async (size, fps) => {
    const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target,
      video: { codec: "avc", width: size.width, height: size.height, frameRate: fps },
      fastStart: "in-memory",
    });
    return {
      addVideoChunk: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      finalize: () => {
        muxer.finalize();
        return new Uint8Array(target.buffer);
      },
    };
  },
  // A message to itself rather than a timer: timers of a page that is not in front are held back
  // to one a second, which would make a video made in the background take many minutes.
  nextTurn: () =>
    new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        resolve();
      };
      channel.port2.postMessage(null);
    }),
};

function configFor(codec: string, size: VideoSize, fps: number, bitrate: number) {
  return {
    codec,
    width: size.width,
    height: size.height,
    bitrate,
    framerate: fps,
    avc: { format: "avc" as const },
  };
}

/** The best H.264 profile the browser can encode at this size, or null when it can encode none. */
export async function findH264Codec(
  size: VideoSize,
  fps: number,
  bitrate: number,
  deps: EncodeDeps = browserDeps,
): Promise<string | null> {
  for (const codec of H264_CODECS) {
    try {
      const result = await deps.isConfigSupported(configFor(codec, size, fps, bitrate));
      if (result.supported) return codec;
    } catch {
      // A codec the browser does not even recognise counts as not supported.
    }
  }
  return null;
}

export interface EncodeOptions {
  /** The canvas the frames are drawn on; its pixels are what is encoded. */
  canvas: HTMLCanvasElement;
  size: VideoSize;
  fps: number;
  frames: number;
  bitrate: number;
  /** Paints frame `k` on the canvas. */
  drawFrame(k: number): void;
  /** Called after each frame with how much is done, from 0 to 1. */
  onProgress?: (progress: number) => void;
  /** Aborting it stops the encoding and rejects with an `AbortError`. */
  signal?: AbortSignal;
}

/**
 * Encodes the frames of a canvas as an H.264 MP4 file with the browser's own encoder. Frames are
 * encoded as fast as the encoder takes them, not in real time, so the page does not need to stay
 * in front for the video to come out right.
 */
export async function encodeMp4(
  options: EncodeOptions,
  deps: EncodeDeps = browserDeps,
): Promise<Uint8Array> {
  const { size, fps, frames, bitrate } = options;
  const codec = await findH264Codec(size, fps, bitrate, deps);
  if (!codec) throw new Mp4EncodingUnsupportedError();

  const muxer = await deps.createMuxer(size, fps);
  let failure: Error | null = null;
  const encoder = deps.createEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      failure = error;
    },
  });
  encoder.configure(configFor(codec, size, fps, bitrate));

  const check = () => {
    if (options.signal?.aborted) {
      throw new DOMException("The video was cancelled.", "AbortError");
    }
    if (failure) throw failure;
  };

  try {
    for (let k = 0; k < frames; k++) {
      check();
      options.drawFrame(k);
      const frame = deps.createFrame(options.canvas, {
        timestamp: Math.round((k * 1_000_000) / fps),
        duration: Math.round(1_000_000 / fps),
      });
      try {
        encoder.encode(frame, { keyFrame: k % (fps * KEY_FRAME_SECONDS) === 0 });
      } finally {
        frame.close();
      }
      options.onProgress?.((k + 1) / frames);

      while (encoder.encodeQueueSize > MAX_QUEUED_FRAMES) {
        await deps.nextTurn();
        check();
      }
      if (k % FRAMES_PER_TURN === FRAMES_PER_TURN - 1) await deps.nextTurn();
    }
    await encoder.flush();
    check();
    return muxer.finalize();
  } finally {
    try {
      encoder.close();
    } catch {
      // An encoder that failed is already closed, and closing it again is an error.
    }
  }
}
