import { Encoder } from "@garmin/fitsdk";
import type { FitFile } from "@/fit/readFit";

interface Source {
  bytes: Uint8Array;
  /** True when the bytes came out of the store, so they do not need saving again. */
  persisted: boolean;
}

/**
 * The bytes a ride was read from, keyed by its `FitFile` object. A loaded ride keeps its decoded
 * messages but not its original bytes; whoever reads a file registers them here, and the
 * persistence hook finds them again through `ride.fit` (the same object travels through the app
 * state). The map is weak, so a removed ride frees its bytes.
 */
const sources = new WeakMap<FitFile, Source>();

export function rememberSource(
  fit: FitFile,
  bytes: Uint8Array,
  options: { persisted?: boolean } = {},
): void {
  sources.set(fit, { bytes, persisted: options.persisted ?? false });
}

export function sourceOf(fit: FitFile): Source | undefined {
  return sources.get(fit);
}

type Writable = Parameters<Encoder["writeMesg"]>[0];

/** A FIT file written from the messages, for a ride whose original bytes are not known. */
export function encodeFit(fit: FitFile): Uint8Array {
  const encoder = new Encoder();
  for (const message of fit.messages) {
    encoder.writeMesg({ ...message.fields, mesgNum: message.mesgNum } as Writable);
  }
  return encoder.close();
}
