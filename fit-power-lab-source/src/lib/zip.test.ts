import { describe, expect, it } from "vitest";
import { createZip, crc32 } from "@/lib/zip";

const text = (value: string) => new TextEncoder().encode(value);

interface ParsedEntry {
  name: string;
  data: Uint8Array;
  crc: number;
  method: number;
  flags: number;
  dosTime: number;
  dosDate: number;
}

/** A tiny independent reader: walks the central directory, then the local header it points to. */
function parseZip(bytes: Uint8Array): ParsedEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("no end of central directory");

  const count = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  expect(view.getUint16(eocd + 8, true)).toBe(count);
  expect(centralOffset + centralSize).toBe(eocd);

  const entries: ParsedEntry[] = [];
  let at = centralOffset;
  for (let n = 0; n < count; n++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const flags = view.getUint16(at + 8, true);
    const method = view.getUint16(at + 10, true);
    const dosTime = view.getUint16(at + 12, true);
    const dosDate = view.getUint16(at + 14, true);
    const crc = view.getUint32(at + 16, true);
    const compressed = view.getUint32(at + 20, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const localOffset = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extraLength + commentLength;

    expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
    expect(view.getUint32(localOffset + 14, true)).toBe(crc);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    expect(compressed).toBe(size);
    entries.push({
      name,
      data: bytes.slice(dataStart, dataStart + size),
      crc,
      method,
      flags,
      dosTime,
      dosDate,
    });
  }
  return entries;
}

describe("crc32", () => {
  it("matches the standard check value", () => {
    expect(crc32(text("123456789"))).toBe(0xcbf43926);
  });

  it("is zero for no data", () => {
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe("createZip", () => {
  it("stores every entry byte for byte, in order, without compression", () => {
    const binary = Uint8Array.from({ length: 1000 }, (_, i) => (i * 7) % 256);
    const zip = createZip([
      { name: "a.fit", data: text("first file") },
      { name: "Activities/b.fit", data: binary },
      { name: "empty.fit", data: new Uint8Array() },
    ]);

    const entries = parseZip(zip);

    expect(entries.map((e) => e.name)).toEqual(["a.fit", "Activities/b.fit", "empty.fit"]);
    expect(entries.map((e) => e.method)).toEqual([0, 0, 0]);
    expect(Array.from(entries[0]?.data ?? [])).toEqual(Array.from(text("first file")));
    expect(Array.from(entries[1]?.data ?? [])).toEqual(Array.from(binary));
    expect(entries[2]?.data.length).toBe(0);
  });

  it("writes the CRC32 of each entry", () => {
    const zip = createZip([{ name: "check.txt", data: text("123456789") }]);

    expect(parseZip(zip)[0]?.crc).toBe(0xcbf43926);
  });

  it("flags names as UTF-8 so accents survive", () => {
    const zip = createZip([{ name: "carrera-ñandú.fit", data: text("x") }]);

    const [entry] = parseZip(zip);

    expect(entry?.name).toBe("carrera-ñandú.fit");
    expect((entry?.flags ?? 0) & 0x0800).toBe(0x0800);
  });

  it("stores the modified time in DOS format (local time, two second steps)", () => {
    const modified = new Date(2024, 1, 25, 13, 31, 45);
    const [entry] = parseZip(createZip([{ name: "a.fit", data: text("x"), modified }]));

    expect(entry?.dosDate).toBe(((2024 - 1980) << 9) | (2 << 5) | 25);
    expect(entry?.dosTime).toBe((13 << 11) | (31 << 5) | 22);
  });

  it("clamps dates before 1980 to the DOS epoch", () => {
    const [entry] = parseZip(
      createZip([{ name: "a.fit", data: text("x"), modified: new Date(1970, 0, 1) }]),
    );

    expect(entry?.dosDate).toBe((0 << 9) | (1 << 5) | 1);
  });

  it("makes a valid empty archive", () => {
    const zip = createZip([]);

    expect(zip.length).toBe(22);
    expect(parseZip(zip)).toEqual([]);
  });

  it("refuses names that could escape the extraction folder or repeat", () => {
    const data = text("x");

    expect(() => createZip([{ name: "../evil.fit", data }])).toThrow(RangeError);
    expect(() => createZip([{ name: "/abs.fit", data }])).toThrow(RangeError);
    expect(() => createZip([{ name: "a\\b.fit", data }])).toThrow(RangeError);
    expect(() => createZip([{ name: "", data }])).toThrow(RangeError);
    expect(() =>
      createZip([
        { name: "same.fit", data },
        { name: "same.fit", data },
      ]),
    ).toThrow(RangeError);
  });
});
