import { describe, expect, it } from "vitest";
import { toGpx } from "@/domain/exporters/gpx";
import { rideOf } from "@/test/rideOf";

const GPX = "http://www.topografix.com/GPX/1/1";
const TPX = "http://www.garmin.com/xmlschemas/TrackPointExtension/v1";
const PWR = "http://www.garmin.com/xmlschemas/PowerExtension/v1";

const ride = rideOf([
  {
    t: 0,
    distance: 0,
    altitude: 2450.5,
    speed: 5,
    cadence: 80,
    heartRate: 120,
    temperature: 14,
    lat: 4.7,
    lon: -30.1,
  },
  {
    t: 1,
    distance: 5,
    altitude: 2451,
    speed: 5,
    cadence: 82,
    heartRate: 0,
    temperature: 14,
    lat: 4.700045,
    lon: -30.1,
  },
  { t: 2, distance: 10, altitude: 2451.5, speed: 5, cadence: 84, heartRate: 122, temperature: 14 },
  {
    t: 3,
    distance: 15,
    altitude: 2452,
    speed: 5,
    cadence: 84,
    heartRate: 123,
    temperature: 14,
    lat: 4.70009,
    lon: -30.1,
  },
]);
const watts = [100, 110, 120, 130];

function parse(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
  return doc;
}
const text = (el: Element | null | undefined, ns: string, name: string) =>
  el?.getElementsByTagNameNS(ns, name)[0]?.textContent ?? null;

describe("toGpx", () => {
  it("is a GPX 1.1 document with one track segment", () => {
    const doc = parse(toGpx(ride, watts, { name: "morning ride" }));

    expect(doc.documentElement.localName).toBe("gpx");
    expect(doc.documentElement.namespaceURI).toBe(GPX);
    expect(doc.documentElement.getAttribute("version")).toBe("1.1");
    expect(doc.getElementsByTagNameNS(GPX, "trkseg")).toHaveLength(1);
    expect(text(doc.documentElement, GPX, "name")).toBe("morning ride");
  });

  it("writes a track point with elevation and time for every sample that has a position", () => {
    const doc = parse(toGpx(ride, watts));

    const points = [...doc.getElementsByTagNameNS(GPX, "trkpt")];
    expect(points).toHaveLength(3);
    expect(points[0]?.getAttribute("lat")).toBe("4.7");
    expect(points[0]?.getAttribute("lon")).toBe("-30.1");
    expect(text(points[0], GPX, "ele")).toBe("2450.5");
    expect(text(points[0], GPX, "time")).toBe("2024-02-25T13:31:00.000Z");
    expect(text(points[2], GPX, "ele")).toBe("2452");
  });

  it("writes heart rate, cadence, temperature and power in the usual extensions", () => {
    const doc = parse(toGpx(ride, watts));

    const [first] = [...doc.getElementsByTagNameNS(GPX, "trkpt")];
    expect(text(first, TPX, "hr")).toBe("120");
    expect(text(first, TPX, "cad")).toBe("80");
    expect(text(first, TPX, "atemp")).toBe("14");
    expect(text(first, PWR, "PowerInWatts")).toBe("100");
    expect(text(first, GPX, "power")).toBe("100");
  });

  it("leaves out the heart rate of a sample whose strap had no signal", () => {
    const doc = parse(toGpx(ride, watts));

    const second = [...doc.getElementsByTagNameNS(GPX, "trkpt")][1];
    expect(text(second, TPX, "hr")).toBeNull();
    expect(text(second, TPX, "cad")).toBe("82");
    expect(text(second, PWR, "PowerInWatts")).toBe("110");
  });

  it("escapes the name", () => {
    const doc = parse(toGpx(ride, watts, { name: `A & B <"x">` }));

    expect(text(doc.documentElement, GPX, "name")).toBe(`A & B <"x">`);
  });

  it("writes a track without points for a ride with no GPS", () => {
    const indoor = rideOf([{ t: 0, distance: 0, altitude: 0, speed: 0 }]);

    const doc = parse(toGpx(indoor, [0]));

    expect(doc.getElementsByTagNameNS(GPX, "trkpt")).toHaveLength(0);
  });

  it("refuses watts that do not match the samples", () => {
    expect(() => toGpx(ride, [1])).toThrow(RangeError);
  });
});
