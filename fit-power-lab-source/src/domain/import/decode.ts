import { RideImportError } from "@/domain/import/errors";
import { readGpx } from "@/domain/import/gpx";
import { rideToFit } from "@/domain/import/rideToFit";
import { readTcx } from "@/domain/import/tcx";
import { rideFromFit, type Ride } from "@/domain/ride";
import { readFit, type FitFile } from "@/fit/readFit";

export type ImportSource = "fit" | "gpx" | "tcx";

/** A file read into the two things the app keeps for every ride: its FIT messages and its ride. */
export interface DecodedRide {
  source: ImportSource;
  fit: FitFile;
  ride: Ride;
}

const SNIFF_BYTES = 4096;

/** A FIT file has ".FIT" at bytes 8 to 11 of its header. */
function hasFitHeader(bytes: Uint8Array): boolean {
  return bytes[8] === 0x2e && bytes[9] === 0x46 && bytes[10] === 0x49 && bytes[11] === 0x54;
}

/** The format of a file: from its content when it is recognizable, else from its extension. */
export function detectFormat(name: string, bytes: Uint8Array): ImportSource | null {
  if (hasFitHeader(bytes)) return "fit";
  const head = new TextDecoder().decode(bytes.subarray(0, SNIFF_BYTES));
  if (/<gpx[\s>]/i.test(head)) return "gpx";
  if (/<TrainingCenterDatabase[\s>]/.test(head)) return "tcx";

  const extension = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase();
  return extension === "fit" || extension === "gpx" || extension === "tcx" ? extension : null;
}

/**
 * The one way a ride file is read, for a file just chosen and for one restored from storage.
 * FIT errors (`FitReadError`, `NoUsableRecordsError`) and import errors (`RideImportError`) pass
 * through. GPX and TCX rides get a synthesized FIT and the ride is read back from it, so every
 * source ends up with the same shape.
 */
export function decodeRideFile(name: string, bytes: Uint8Array): DecodedRide {
  const source = detectFormat(name, bytes);
  if (source === null) throw new RideImportError("unsupported");

  if (source === "fit") {
    const fit = readFit(bytes);
    return { source, fit, ride: rideFromFit(fit) };
  }

  const text = new TextDecoder().decode(bytes);
  const { ride, power } = source === "gpx" ? readGpx(text) : readTcx(text);
  const fit = rideToFit(ride, name, { power });
  return { source, fit, ride: rideFromFit(fit) };
}
