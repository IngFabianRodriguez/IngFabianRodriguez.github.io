import { describe, expect, it, vi } from "vitest";
import {
  encodeMp4,
  findH264Codec,
  H264_CODECS,
  Mp4EncodingUnsupportedError,
  type EncodeDeps,
} from "@/features/flyover/encodeMp4";

const size = { width: 1080, height: 1920 };
const canvas = {} as HTMLCanvasElement;

type Init = { output(chunk: unknown, meta?: unknown): void; error(e: Error): void };

/** A browser encoder and muxer that only keep a record of what they are asked. */
function fakeDeps(over: { supported?: (codec: string) => boolean; queue?: () => number } = {}) {
  const log: string[] = [];
  const encoded: { timestamp: number; duration: number; keyFrame: boolean }[] = [];
  const closedFrames: number[] = [];
  const chunks: unknown[] = [];
  let init: Init = { output: () => {}, error: () => {} };
  let configured: unknown = null;
  let frameCount = 0;

  const encoder = {
    get encodeQueueSize() {
      return over.queue?.() ?? 0;
    },
    configure: vi.fn((config: unknown) => {
      configured = config;
      log.push("configure");
    }),
    encode: vi.fn(
      (frame: { timestamp: number; duration: number; id: number }, opts: { keyFrame: boolean }) => {
        log.push(`encode ${frame.id}`);
        encoded.push({
          timestamp: frame.timestamp,
          duration: frame.duration,
          keyFrame: opts.keyFrame,
        });
        init.output({ chunk: frame.id }, { meta: true });
      },
    ),
    flush: vi.fn(async () => {
      log.push("flush");
    }),
    close: vi.fn(() => log.push("close")),
  };
  const muxer = {
    addVideoChunk: vi.fn((chunk: unknown, meta: unknown) => chunks.push([chunk, meta])),
    finalize: vi.fn(() => {
      log.push("finalize");
      return new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]);
    }),
  };
  const deps: EncodeDeps = {
    isConfigSupported: async (config) => ({ supported: over.supported?.(config.codec) ?? true }),
    createEncoder: (i) => {
      init = i;
      return encoder as never;
    },
    createFrame: (_canvas, frameInit) => {
      const id = frameCount++;
      return {
        id,
        timestamp: frameInit.timestamp,
        duration: frameInit.duration,
        close: () => closedFrames.push(id),
      } as never;
    },
    createMuxer: async () => muxer,
    nextTurn: async () => {},
  };
  return {
    deps,
    log,
    encoded,
    closedFrames,
    chunks,
    encoder,
    muxer,
    fail: (e: Error) => init.error(e),
    configured: () => configured,
  };
}

function run(
  fake: ReturnType<typeof fakeDeps>,
  over: Partial<Parameters<typeof encodeMp4>[0]> = {},
) {
  return encodeMp4(
    { canvas, size, fps: 30, frames: 90, bitrate: 8_000_000, drawFrame: () => {}, ...over },
    fake.deps,
  );
}

describe("findH264Codec", () => {
  it("picks the most capable H.264 profile the browser can encode at this size", async () => {
    const fake = fakeDeps();
    expect(H264_CODECS[0]).toBe("avc1.640028");
    expect(await findH264Codec(size, 30, 8_000_000, fake.deps)).toBe("avc1.640028");

    const noHigh = fakeDeps({ supported: (c) => c !== "avc1.640028" });
    expect(await findH264Codec(size, 30, 8_000_000, noHigh.deps)).toBe("avc1.4d0028");
  });

  it("is null when the browser can encode none of them", async () => {
    const none = fakeDeps({ supported: () => false });

    expect(await findH264Codec(size, 30, 8_000_000, none.deps)).toBeNull();
  });
});

describe("encodeMp4", () => {
  it("encodes each frame, in order, at the frame rate, and gives the file", async () => {
    const fake = fakeDeps();
    const drawn: number[] = [];

    const bytes = await run(fake, { drawFrame: (k) => drawn.push(k) });

    expect(drawn).toEqual(Array.from({ length: 90 }, (_, k) => k));
    expect(fake.encoded).toHaveLength(90);
    expect(fake.encoded[0]).toMatchObject({ timestamp: 0, duration: 33333 });
    expect(fake.encoded[30]?.timestamp).toBe(1_000_000);
    expect(fake.encoded[89]?.timestamp).toBe(Math.round((89 * 1_000_000) / 30));
    expect(bytes).toEqual(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]));
    expect(fake.chunks).toHaveLength(90);
  });

  it("is set up for H.264 at the size and the frame rate asked", async () => {
    const fake = fakeDeps();

    await run(fake);

    expect(fake.configured()).toMatchObject({
      codec: "avc1.640028",
      width: 1080,
      height: 1920,
      framerate: 30,
      bitrate: 8_000_000,
      avc: { format: "avc" },
    });
  });

  it("starts with a key frame and puts one every two seconds, so the video can be skipped through", async () => {
    const fake = fakeDeps();

    await run(fake, { frames: 150 });

    const keys = fake.encoded.flatMap((f, k) => (f.keyFrame ? [k] : []));
    expect(keys).toEqual([0, 60, 120]);
  });

  it("lets go of every frame it makes", async () => {
    const fake = fakeDeps();

    await run(fake);

    expect(fake.closedFrames).toHaveLength(90);
  });

  it("finishes the encoder before it closes the file, and then lets go of it", async () => {
    const fake = fakeDeps();

    await run(fake);

    const tail = fake.log.slice(-3);
    expect(tail).toEqual(["flush", "finalize", "close"]);
  });

  it("reports how far it has got, up to all of it", async () => {
    const fake = fakeDeps();
    const seen: number[] = [];

    await run(fake, { frames: 4, onProgress: (p) => seen.push(p) });

    expect(seen).toEqual([0.25, 0.5, 0.75, 1]);
  });

  it("waits while the encoder has too many frames waiting", async () => {
    let queue = 0;
    const fake = fakeDeps({ queue: () => queue });
    let turns = 0;
    fake.deps.nextTurn = async () => {
      turns++;
      queue = 0;
    };
    const original = fake.encoder.encode.getMockImplementation();
    fake.encoder.encode.mockImplementation((frame, opts) => {
      original?.(frame, opts);
      queue = 12;
    });

    await run(fake, { frames: 10 });

    expect(turns).toBeGreaterThanOrEqual(9);
  });

  it("stops, lets go of the encoder and rejects when it is cancelled", async () => {
    const fake = fakeDeps();
    const controller = new AbortController();

    await expect(
      run(fake, {
        signal: controller.signal,
        drawFrame: (k) => {
          if (k === 20) controller.abort();
        },
      }),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(fake.encoded.length).toBeLessThan(25);
    expect(fake.muxer.finalize).not.toHaveBeenCalled();
    expect(fake.encoder.close).toHaveBeenCalledTimes(1);
    expect(fake.closedFrames.length).toBe(fake.encoded.length);
  });

  it("rejects with the error of the encoder and lets go of it", async () => {
    const fake = fakeDeps();

    await expect(
      run(fake, {
        drawFrame: (k) => {
          if (k === 5) fake.fail(new Error("hardware encoder lost"));
        },
      }),
    ).rejects.toThrow("hardware encoder lost");

    expect(fake.muxer.finalize).not.toHaveBeenCalled();
    expect(fake.encoder.close).toHaveBeenCalledTimes(1);
  });

  it("says so, and draws nothing, when the browser cannot encode H.264", async () => {
    const fake = fakeDeps({ supported: () => false });
    const drawn = vi.fn();

    await expect(run(fake, { drawFrame: drawn })).rejects.toBeInstanceOf(
      Mp4EncodingUnsupportedError,
    );
    expect(drawn).not.toHaveBeenCalled();
  });
});
