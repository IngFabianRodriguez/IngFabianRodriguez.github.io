import { Decoder, Stream } from "@garmin/fitsdk";

export interface FitMessage {
  mesgNum: number;
  fields: Record<string, unknown>;
}

export interface FitFile {
  /** Every message of the file, in the order it was stored. */
  messages: FitMessage[];
}

export class FitReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FitReadError";
  }
}

/**
 * Decodes a FIT file keeping its messages exactly as stored: sub-fields, components and
 * merged heart rates stay off so that the same messages can be written back unchanged.
 */
export function readFit(bytes: Uint8Array): FitFile {
  const decoder = new Decoder(Stream.fromArrayBuffer(bytes.slice().buffer));

  if (!decoder.isFIT()) {
    throw new FitReadError("The file is not a valid FIT file.");
  }
  if (!decoder.checkIntegrity()) {
    throw new FitReadError("The FIT file is corrupted or truncated (integrity check failed).");
  }

  const messages: FitMessage[] = [];
  const { errors } = decoder.read({
    mesgListener: (mesgNum, fields) => {
      messages.push({ mesgNum, fields: { ...fields } });
    },
    expandSubFields: false,
    expandComponents: false,
    mergeHeartRates: false,
  });

  if (errors.length > 0) {
    throw new FitReadError(`The FIT file could not be decoded: ${errors[0]?.message ?? "unknown"}`);
  }

  return { messages };
}
