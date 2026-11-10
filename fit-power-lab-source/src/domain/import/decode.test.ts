import { describe, expect, it } from "vitest";
import { decodeRideFile, detectFormat } from "@/domain/import/decode";
import { RideImportError } from "@/domain/import/errors";
import { gpxText, straightPoints, tcxText } from "@/domain/import/testData";
import { rideFromFit } from "@/domain/ride";
import { MESG_RECORD } from "@/fit/mesgNum";
import { FitReadError } from "@/fit/readFit";
import { buildFit } from "@/test/buildFit";
import { steadyRecords } from "@/test/fixtures";

const bytesOf = (text: string) => new TextEncoder().encode(text);

describe("detectFormat", () => {
  it("tells the format from the content, whatever the file is called", () => {
    expect(detectFormat("ride.bin", buildFit(steadyRecords(3)))).toBe("fit");
    expect(detectFormat("ride.txt", bytesOf(gpxText(straightPoints(2))))).toBe("gpx");
    expect(detectFormat("ride.txt", bytesOf(tcxText(straightPoints(2))))).toBe("tcx");
  });

  it("falls back to the extension when the content says nothing", () => {
    expect(detectFormat("broken.FIT", new Uint8Array(20))).toBe("fit");
    expect(detectFormat("broken.gpx", bytesOf("nothing"))).toBe("gpx");
    expect(detectFormat("broken.tcx", bytesOf("nothing"))).toBe("tcx");
    expect(detectFormat("notes.txt", bytesOf("nothing"))).toBeNull();
  });
});

describe("decodeRideFile", () => {
  it("decodes a FIT file into its messages and ride", () => {
    const decoded = decodeRideFile("a.fit", buildFit(steadyRecords(8)));

    expect(decoded.source).toBe("fit");
    expect(decoded.ride.samples).toHaveLength(8);
    expect(decoded.fit.messages.filter((m) => m.mesgNum === MESG_RECORD)).toHaveLength(8);
  });

  it("turns a GPX file into a ride that also has a FIT", () => {
    const decoded = decodeRideFile("a.gpx", bytesOf(gpxText(straightPoints(6))));

    expect(decoded.source).toBe("gpx");
    expect(decoded.ride.samples).toHaveLength(6);
    expect(decoded.ride).toEqual(rideFromFit(decoded.fit));
    expect(decoded.fit.messages.filter((m) => m.mesgNum === MESG_RECORD)).toHaveLength(6);
  });

  it("keeps the watts of a TCX file in the FIT records", () => {
    const decoded = decodeRideFile(
      "a.tcx",
      bytesOf(tcxText(straightPoints(4, (i) => ({ power: 180 + i })))),
    );

    expect(decoded.source).toBe("tcx");
    const watts = decoded.fit.messages
      .filter((m) => m.mesgNum === MESG_RECORD)
      .map((m) => m.fields["power"]);
    expect(watts).toEqual([180, 181, 182, 183]);
  });

  it("reads a document that starts with a byte order mark", () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const body = bytesOf(gpxText(straightPoints(3)));
    const withBom = new Uint8Array([...bom, ...body]);

    expect(decodeRideFile("a.gpx", withBom).ride.samples).toHaveLength(3);
  });

  it("keeps the existing FIT errors for a file that is not a FIT", () => {
    expect(() => decodeRideFile("notes.fit", new Uint8Array(40))).toThrow(FitReadError);
    expect(() => decodeRideFile("notes.fit", new Uint8Array(40))).toThrow(
      "The file is not a valid FIT file.",
    );
  });

  it("says why a GPX or TCX file cannot be used", () => {
    const empty = () => decodeRideFile("a.gpx", bytesOf(gpxText([])));
    expect(empty).toThrow(RideImportError);
    expect(empty).toThrow("The file has no track points.");
    expect(() => decodeRideFile("a.tcx", bytesOf("<x>"))).toThrow(RideImportError);
  });

  it("refuses a file type it does not know", () => {
    try {
      decodeRideFile("notes.txt", bytesOf("hello"));
      expect.unreachable();
    } catch (caught) {
      expect(caught).toBeInstanceOf(RideImportError);
      expect((caught as RideImportError).code).toBe("unsupported");
    }
  });
});
