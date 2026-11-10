const KNOWN_EXTENSION = /\.(fit|gpx|tcx|csv|json)$/i;

/** `2024-02-25.fit` becomes `2024-02-25`. */
export function baseName(fileName: string): string {
  return fileName.replace(KNOWN_EXTENSION, "");
}

/** The name of an export of the ride read from `fileName`: `ride.fit` and `csv` give `ride.csv`. */
export function exportFileName(
  fileName: string,
  extension: "csv" | "gpx" | "tcx" | "json",
): string {
  return `${baseName(fileName)}.${extension}`;
}
