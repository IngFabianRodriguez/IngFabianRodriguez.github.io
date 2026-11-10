export type ImportErrorCode = "malformed" | "empty" | "no-time" | "no-distance" | "unsupported";

const MESSAGES: Record<ImportErrorCode, string> = {
  malformed: "The file is not a valid GPX or TCX document.",
  empty: "The file has no track points.",
  "no-time": "The track points have no timestamps, so speed cannot be worked out.",
  "no-distance": "The file has neither positions nor distances.",
  unsupported: "That file type is not supported. Use .fit, .gpx or .tcx files.",
};

/** A file that cannot become a ride; `code` lets the UI show the reason in the user's language. */
export class RideImportError extends Error {
  readonly code: ImportErrorCode;

  constructor(code: ImportErrorCode) {
    super(MESSAGES[code]);
    this.name = "RideImportError";
    this.code = code;
  }
}
