import { describe, expect, it } from "vitest";
import { MESG_FILE_ID, MESG_RECORD } from "@/fit/mesgNum";
import { FitReadError, readFit } from "@/fit/readFit";
import { buildFit } from "@/test/buildFit";

const t0 = new Date("2024-02-25T13:31:00Z");
const at = (s: number) => new Date(t0.getTime() + s * 1000);

describe("readFit", () => {
  it("returns every message in file order with its message number", () => {
    const bytes = buildFit([
      { timestamp: at(0), distance: 0, altitude: 2430.8, speed: 0 },
      { timestamp: at(1), distance: 3, altitude: 2430.8, speed: 3 },
    ]);

    const { messages } = readFit(bytes);

    expect(messages.map((m) => m.mesgNum)).toEqual([MESG_FILE_ID, MESG_RECORD, MESG_RECORD]);
    expect(messages[2]?.fields["speed"]).toBeCloseTo(3, 3);
  });

  it("rejects bytes that are not a FIT file", () => {
    expect(() => readFit(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]))).toThrow(
      new FitReadError("The file is not a valid FIT file."),
    );
  });

  it("rejects a FIT file whose contents were corrupted", () => {
    const bytes = buildFit([{ timestamp: at(0), distance: 0, altitude: 2430.8, speed: 0 }]);
    const corrupted = bytes.slice();
    const middle = Math.floor(corrupted.length / 2);
    corrupted[middle] = (corrupted[middle] ?? 0) ^ 0xff;

    expect(() => readFit(corrupted)).toThrow(
      new FitReadError("The FIT file is corrupted or truncated (integrity check failed)."),
    );
  });
});
