import { describe, expect, it } from "vitest";
import { toTcx } from "@/domain/exporters/tcx";
import { rideOf } from "@/test/rideOf";

const TCX = "http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2";
const AX = "http://www.garmin.com/xmlschemas/ActivityExtension/v2";

const ride = rideOf([
  {
    t: 0,
    distance: 0,
    altitude: 2450.5,
    speed: 4,
    cadence: 80,
    heartRate: 120,
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
    lat: 4.700045,
    lon: -30.1,
  },
  { t: 2, distance: 10, altitude: 2451.5, speed: 6, cadence: 84, heartRate: 122 },
]);
const watts = [100, 110, 120];

function parse(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
  return doc;
}
const first = (el: Element | Document | null | undefined, ns: string, name: string) =>
  el?.getElementsByTagNameNS(ns, name)[0] ?? null;

describe("toTcx", () => {
  it("is a TrainingCenterDatabase with one cycling activity and one lap", () => {
    const doc = parse(toTcx(ride, watts));

    expect(doc.documentElement.localName).toBe("TrainingCenterDatabase");
    expect(doc.documentElement.namespaceURI).toBe(TCX);
    const activity = first(doc, TCX, "Activity");
    expect(activity?.getAttribute("Sport")).toBe("Biking");
    expect(first(activity, TCX, "Id")?.textContent).toBe("2024-02-25T13:31:00.000Z");
    expect(doc.getElementsByTagNameNS(TCX, "Lap")).toHaveLength(1);
  });

  it("writes one trackpoint per sample with time, altitude, distance, heart rate and cadence", () => {
    const doc = parse(toTcx(ride, watts));

    const points = [...doc.getElementsByTagNameNS(TCX, "Trackpoint")];
    expect(points).toHaveLength(3);
    const [p0, p1, p2] = points;
    expect(first(p0, TCX, "Time")?.textContent).toBe("2024-02-25T13:31:00.000Z");
    expect(first(p0, TCX, "LatitudeDegrees")?.textContent).toBe("4.7");
    expect(first(p0, TCX, "LongitudeDegrees")?.textContent).toBe("-30.1");
    expect(first(p0, TCX, "AltitudeMeters")?.textContent).toBe("2450.5");
    expect(first(p0, TCX, "DistanceMeters")?.textContent).toBe("0");
    expect(first(first(p0, TCX, "HeartRateBpm"), TCX, "Value")?.textContent).toBe("120");
    expect(first(p0, TCX, "Cadence")?.textContent).toBe("80");
    expect(first(p1, TCX, "HeartRateBpm")).toBeNull();
    expect(first(p2, TCX, "Position")).toBeNull();
  });

  it("writes the watts of every trackpoint in the activity extension", () => {
    const doc = parse(toTcx(ride, watts));

    const points = [...doc.getElementsByTagNameNS(TCX, "Trackpoint")];
    expect(points.map((p) => first(p, AX, "Watts")?.textContent)).toEqual(["100", "110", "120"]);
    expect(points.map((p) => first(p, AX, "Speed")?.textContent)).toEqual(["4", "5", "6"]);
  });

  it("totals the lap from the samples", () => {
    const doc = parse(toTcx(ride, watts));

    const lap = first(doc, TCX, "Lap");
    expect(lap?.getAttribute("StartTime")).toBe("2024-02-25T13:31:00.000Z");
    expect(first(lap, TCX, "TotalTimeSeconds")?.textContent).toBe("2");
    expect(first(lap, TCX, "DistanceMeters")?.textContent).toBe("10");
    expect(first(lap, TCX, "MaximumSpeed")?.textContent).toBe("6");
    expect(first(first(lap, TCX, "AverageHeartRateBpm"), TCX, "Value")?.textContent).toBe("121");
    expect(first(lap, AX, "AvgWatts")?.textContent).toBe("110");
    expect(first(lap, AX, "MaxWatts")?.textContent).toBe("120");
  });

  it("refuses watts that do not match the samples", () => {
    expect(() => toTcx(ride, [1])).toThrow(RangeError);
  });
});
