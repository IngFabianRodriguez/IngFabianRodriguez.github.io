import { describe, expect, it } from "vitest";
import { toCsv } from "@/domain/exporters/csv";
import { rideOf } from "@/test/rideOf";

/** Minimal reader for the output: no quoting is ever needed, so a split is a faithful parse. */
function parse(csv: string) {
  const lines = csv.split("\n");
  expect(lines.at(-1)).toBe("");
  const rows = lines.slice(0, -1).map((line) => line.split(","));
  const [header = [], ...body] = rows;
  return {
    header,
    body,
    record: (i: number) => Object.fromEntries(header.map((h, c) => [h, body[i]?.[c]])),
  };
}

const ride = rideOf([
  {
    t: 0,
    distance: 0,
    altitude: 2450.5,
    speed: 0,
    cadence: 0,
    heartRate: 0,
    temperature: 14,
    lat: 4.7,
    lon: -30.1,
  },
  {
    t: 1,
    distance: 5.123,
    altitude: 2451,
    speed: 5.1234,
    cadence: 80,
    heartRate: 121,
    temperature: 14.25,
    lat: 4.700045,
    lon: -30.1,
  },
  {
    t: 2,
    distance: 10.5,
    altitude: 2451.5,
    speed: 5.4,
    cadence: 82,
    heartRate: 122,
    temperature: 14.3,
  },
]);
const watts = [0, 120.4, 135];

describe("toCsv", () => {
  it("writes a header with the unit of every column and one row per sample", () => {
    const { header, body } = parse(toCsv(ride, watts));

    expect(header).toEqual([
      "time_utc",
      "elapsed_s",
      "distance_m",
      "latitude_deg",
      "longitude_deg",
      "speed_mps",
      "cadence_rpm",
      "heart_rate_bpm",
      "power_w",
      "grade_pct",
      "altitude_m",
      "temperature_c",
    ]);
    expect(body).toHaveLength(3);
    expect(body.every((row) => row.length === header.length)).toBe(true);
  });

  it("writes the values of each sample in SI units with a dot as decimal separator", () => {
    const { record } = parse(toCsv(ride, watts));

    expect(record(1)).toMatchObject({
      time_utc: "2024-02-25T13:31:01.000Z",
      elapsed_s: "1",
      distance_m: "5.12",
      latitude_deg: "4.700045",
      longitude_deg: "-30.1",
      speed_mps: "5.123",
      cadence_rpm: "80",
      heart_rate_bpm: "121",
      power_w: "120",
      altitude_m: "2451",
      temperature_c: "14.3",
    });
  });

  it("leaves heart rate empty when the strap reported 0", () => {
    const { record } = parse(toCsv(ride, watts));

    expect(record(0)["heart_rate_bpm"]).toBe("");
    expect(record(2)["heart_rate_bpm"]).toBe("122");
  });

  it("leaves position empty for samples without GPS and keeps the column count", () => {
    const { record } = parse(toCsv(ride, watts));

    expect(record(2)["latitude_deg"]).toBe("");
    expect(record(2)["longitude_deg"]).toBe("");
  });

  it("leaves the cadence column empty when the device never recorded a cadence above 0", () => {
    const noSensor = rideOf([
      { t: 0, distance: 0, altitude: 0, speed: 5, cadence: 0 },
      { t: 1, distance: 5, altitude: 0, speed: 5, cadence: 0 },
    ]);

    const { body, header } = parse(toCsv(noSensor, [10, 10]));

    const cadence = header.indexOf("cadence_rpm");
    expect(body.map((row) => row[cadence])).toEqual(["", ""]);
  });

  it("writes the grade as a percentage and leaves a missing temperature empty", () => {
    const climb = rideOf(
      Array.from({ length: 12 }, (_, i) => ({
        t: i,
        distance: i * 5,
        altitude: i * 0.5,
        speed: 5,
      })),
    );

    const { body, header } = parse(toCsv(climb, Array(12).fill(100)));

    const grade = header.indexOf("grade_pct");
    expect(Number(body[6]?.[grade])).toBeCloseTo(10, 1);
    expect(body[6]?.[header.indexOf("temperature_c")]).toBe("");
  });

  it("refuses watts that do not match the samples", () => {
    expect(() => toCsv(ride, [1])).toThrow(RangeError);
  });
});
