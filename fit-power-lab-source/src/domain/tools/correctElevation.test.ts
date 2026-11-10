import { afterEach, describe, expect, it, vi } from "vitest";
import { rideFromFit } from "@/domain/ride";
import { MESG_SESSION } from "@/domain/tools/fitMesgNums";
import {
  NoPositionError,
  correctElevation,
  elevationAnchors,
} from "@/domain/tools/correctElevation";
import {
  ELEVATION_ENDPOINT,
  ElevationServiceError,
  createElevationLookup,
  type Coordinate,
} from "@/domain/tools/elevationService";
import { buildActivityFit } from "@/domain/tools/testing";
import { readFit } from "@/fit/readFit";
import { steadyRecords } from "@/test/fixtures";

const LAT0 = 4.7;
/** The "terrain": 3000 m at the start, rising 100 m for every 0.001 degrees north. */
const terrain = (lat: number) => 3000 + (lat - LAT0) * 100_000;

function route(count: number) {
  return readFit(
    buildActivityFit(
      steadyRecords(count, (i) => ({ lat: LAT0 + i * 0.00002, lon: -30.1, altitude: 2000 })),
    ),
  );
}

const lookupOf = (calls: Coordinate[][] = []) =>
  vi.fn(async (points: Coordinate[]) => {
    calls.push(points);
    return points.map((p) => terrain(p.lat));
  });

describe("correctElevation", () => {
  it("sets the altitude of every record from the model, interpolating between sampled points", async () => {
    const fit = route(300);

    const corrected = await correctElevation(fit, lookupOf(), 10);

    for (const sample of rideFromFit(corrected).samples) {
      expect(sample.altitude).toBeCloseTo(terrain(sample.lat ?? 0), 0);
    }
    expect(rideFromFit(fit).samples[0]?.altitude).toBe(2000);
  });

  it("asks for at most the requested number of points, spread along the route and including both ends", async () => {
    const calls: Coordinate[][] = [];

    await correctElevation(route(300), lookupOf(calls), 10);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toHaveLength(10);
    expect(calls[0]?.[0]?.lat).toBeCloseTo(LAT0, 5);
    expect(calls[0]?.at(-1)?.lat).toBeCloseTo(LAT0 + 299 * 0.00002, 5);
  });

  it("splits the questions in batches of at most 100 coordinates", async () => {
    const calls: Coordinate[][] = [];

    await correctElevation(route(500), lookupOf(calls), 250);

    expect(calls.length).toBeGreaterThan(1);
    expect(calls.every((c) => c.length <= 100)).toBe(true);
    expect(calls.flat().length).toBe(elevationAnchors(route(500), 250).length);
  });

  it("recomputes the climb of the session from the new altitudes", async () => {
    const corrected = await correctElevation(route(300), lookupOf(), 20);

    const session = corrected.messages.find((m) => m.mesgNum === MESG_SESSION);
    expect(session?.fields["totalAscent"]).toBeCloseTo(terrain(LAT0 + 299 * 0.00002) - 3000, -1);
    expect(session?.fields["totalDescent"]).toBe(0);
  });

  it("throws, and writes nothing, when the ride has no position", async () => {
    const indoor = readFit(
      buildActivityFit(
        steadyRecords(5, () => ({ lat: undefined as never, lon: undefined as never })),
      ),
    );

    await expect(correctElevation(indoor, lookupOf())).rejects.toBeInstanceOf(NoPositionError);
  });

  it("passes on the error of the lookup", async () => {
    const failing = vi.fn().mockRejectedValue(new ElevationServiceError("down"));

    await expect(correctElevation(route(30), failing)).rejects.toBeInstanceOf(
      ElevationServiceError,
    );
  });
});

describe("createElevationLookup", () => {
  afterEach(() => vi.unstubAllGlobals());

  const answer = (body: unknown, ok = true, status = 200) =>
    ({ ok, status, json: async () => body }) as Response;

  it("asks the Open-Meteo elevation endpoint with rounded coordinates and no credentials", async () => {
    const fetchMock = vi.fn(async () => answer({ elevation: [2640, 2655] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createElevationLookup()([
      { lat: 4.712345678, lon: -30.198765432 },
      { lat: 4.7, lon: -30.1 },
    ]);

    expect(result).toEqual([2640, 2655]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe(ELEVATION_ENDPOINT);
    expect(parsed.searchParams.get("latitude")).toBe("4.7123,4.7");
    expect(parsed.searchParams.get("longitude")).toBe("-30.1988,-30.1");
    expect(init).toMatchObject({ credentials: "omit", referrerPolicy: "no-referrer" });
  });

  it("makes one request per 100 coordinates", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const count = new URL(url).searchParams.get("latitude")?.split(",").length ?? 0;
      return answer({ elevation: Array(count).fill(1) });
    });
    const points = Array.from({ length: 230 }, (_, i) => ({ lat: 4 + i / 1000, lon: -74 }));

    const result = await createElevationLookup(fetchMock as unknown as typeof fetch)(points);

    expect(result).toHaveLength(230);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("fails on an error status, a wrong answer or a network error", async () => {
    const point = [{ lat: 4.7, lon: -30.1 }];

    await expect(
      createElevationLookup(vi.fn(async () => answer({}, false, 429)) as unknown as typeof fetch)(
        point,
      ),
    ).rejects.toThrow("429");
    await expect(
      createElevationLookup(
        vi.fn(async () => answer({ elevation: [1, 2] })) as unknown as typeof fetch,
      )(point),
    ).rejects.toBeInstanceOf(ElevationServiceError);
    await expect(
      createElevationLookup(
        vi.fn().mockRejectedValue(new TypeError("offline")) as unknown as typeof fetch,
      )(point),
    ).rejects.toBeInstanceOf(ElevationServiceError);
  });
});
