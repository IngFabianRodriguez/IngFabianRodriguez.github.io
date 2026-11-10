export interface ZipEntry {
  /** Path inside the archive, with forward slashes. */
  name: string;
  data: Uint8Array;
  /** Stored as the DOS date and time (local time); the current time when left out. */
  modified?: Date;
}

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const MAX_ENTRIES = 0xffff;
const MAX_SIZE = 0xffffffff;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** DOS date and time have two second steps and start in 1980. */
function dosDateTime(date: Date): { time: number; date: number } {
  if (date.getFullYear() < 1980) return { time: 0, date: (1 << 5) | 1 };
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function checkName(name: string, seen: Set<string>): void {
  const unsafe =
    name === "" || name.startsWith("/") || name.includes("\\") || name.split("/").includes("..");
  if (unsafe) throw new RangeError(`Not a safe name for a ZIP entry: "${name}".`);
  if (seen.has(name)) throw new RangeError(`Two ZIP entries are named "${name}".`);
  seen.add(name);
}

/**
 * A ZIP archive with stored (uncompressed) entries, which is all that is needed to hand a folder
 * of already compact `.fit` files to the user. Names are UTF-8. No ZIP64: the archive and every
 * entry must stay under 4 GiB and 65535 entries.
 */
export function createZip(entries: ZipEntry[]): Uint8Array {
  if (entries.length > MAX_ENTRIES) throw new RangeError("Too many files for a ZIP archive.");

  const encoder = new TextEncoder();
  const seen = new Set<string>();
  const now = new Date();

  const prepared = entries.map((entry) => {
    checkName(entry.name, seen);
    if (entry.data.length > MAX_SIZE)
      throw new RangeError("A file is too large for a ZIP archive.");
    return {
      name: encoder.encode(entry.name),
      data: entry.data,
      crc: crc32(entry.data),
      stamp: dosDateTime(entry.modified ?? now),
    };
  });

  const localSize = prepared.reduce((sum, e) => sum + 30 + e.name.length + e.data.length, 0);
  const centralSize = prepared.reduce((sum, e) => sum + 46 + e.name.length, 0);
  if (localSize + centralSize + 22 > MAX_SIZE) {
    throw new RangeError("The archive is too large for a ZIP file.");
  }

  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  let at = 0;
  const offsets: number[] = [];

  for (const e of prepared) {
    offsets.push(at);
    view.setUint32(at, LOCAL_HEADER, true);
    view.setUint16(at + 4, 20, true); // version needed
    view.setUint16(at + 6, 0x0800, true); // UTF-8 names
    view.setUint16(at + 8, 0, true); // method: stored
    view.setUint16(at + 10, e.stamp.time, true);
    view.setUint16(at + 12, e.stamp.date, true);
    view.setUint32(at + 14, e.crc, true);
    view.setUint32(at + 18, e.data.length, true);
    view.setUint32(at + 22, e.data.length, true);
    view.setUint16(at + 26, e.name.length, true);
    view.setUint16(at + 28, 0, true);
    out.set(e.name, at + 30);
    out.set(e.data, at + 30 + e.name.length);
    at += 30 + e.name.length + e.data.length;
  }

  const centralStart = at;
  prepared.forEach((e, i) => {
    view.setUint32(at, CENTRAL_HEADER, true);
    view.setUint16(at + 4, 20, true); // version made by
    view.setUint16(at + 6, 20, true); // version needed
    view.setUint16(at + 8, 0x0800, true);
    view.setUint16(at + 10, 0, true);
    view.setUint16(at + 12, e.stamp.time, true);
    view.setUint16(at + 14, e.stamp.date, true);
    view.setUint32(at + 16, e.crc, true);
    view.setUint32(at + 20, e.data.length, true);
    view.setUint32(at + 24, e.data.length, true);
    view.setUint16(at + 28, e.name.length, true);
    // extra, comment, disk, internal and external attributes stay zero
    view.setUint32(at + 42, offsets[i] ?? 0, true);
    out.set(e.name, at + 46);
    at += 46 + e.name.length;
  });

  view.setUint32(at, END_OF_CENTRAL_DIRECTORY, true);
  view.setUint16(at + 8, prepared.length, true);
  view.setUint16(at + 10, prepared.length, true);
  view.setUint32(at + 12, at - centralStart, true);
  view.setUint32(at + 16, centralStart, true);

  return out;
}
