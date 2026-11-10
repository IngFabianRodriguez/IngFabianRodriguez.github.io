import { describe, expect, it } from "vitest";
import { decodeRideFile } from "@/domain/import/decode";
import { gpxText, straightPoints } from "@/domain/import/testData";
import { createMemoryRideStore } from "@/lib/persistence/memoryStore";
import { restoreRides } from "@/lib/persistence/restoreRides";
import type { RideStore, StoredRide } from "@/lib/persistence/rideStore";
import { sourceOf } from "@/lib/persistence/sources";
import { buildFit } from "@/test/buildFit";
import { steadyRecords } from "@/test/fixtures";

const stored = (over: Partial<StoredRide> & Pick<StoredRide, "id" | "bytes">): StoredRide => ({
  fileName: `${over.id}.fit`,
  source: "fit",
  savedAt: 1,
  ...over,
});

describe("restoreRides", () => {
  it("returns the stored rides, oldest first, read through the normal decoding path", async () => {
    const store = createMemoryRideStore();
    const fitBytes = buildFit(steadyRecords(12));
    const gpxBytes = new TextEncoder().encode(gpxText(straightPoints(7)));
    await store.saveRide(stored({ id: "one", bytes: fitBytes }));
    await store.saveRide(
      stored({ id: "two", fileName: "two.gpx", source: "gpx", bytes: gpxBytes }),
    );

    const rides = await restoreRides(store);

    expect(rides.map((r) => [r.id, r.fileName, r.source])).toEqual([
      ["one", "one.fit", "fit"],
      ["two", "two.gpx", "gpx"],
    ]);
    expect(rides[0]?.ride.samples).toHaveLength(12);
    expect(rides[1]?.ride).toEqual(decodeRideFile("two.gpx", gpxBytes).ride);
    expect(rides[1]?.fit.messages.length).toBeGreaterThan(7);
  });

  it("skips the rides whose bytes are corrupted and returns the others", async () => {
    const store = createMemoryRideStore();
    await store.saveRide(stored({ id: "bad", bytes: new Uint8Array(30) }));
    await store.saveRide(stored({ id: "good", bytes: buildFit(steadyRecords(5)) }));
    await store.saveRide(
      stored({
        id: "bad-gpx",
        fileName: "x.gpx",
        source: "gpx",
        bytes: new TextEncoder().encode("<gpx>"),
      }),
    );

    const rides = await restoreRides(store);

    expect(rides.map((r) => r.id)).toEqual(["good"]);
  });

  it("marks what it restores as already stored, with its bytes, so it is not saved again", async () => {
    const store = createMemoryRideStore();
    const bytes = buildFit(steadyRecords(5));
    await store.saveRide(stored({ id: "a", bytes }));

    const [ride] = await restoreRides(store);

    const source = ride ? sourceOf(ride.fit) : undefined;
    expect(source?.persisted).toBe(true);
    expect(Array.from(source?.bytes ?? [])).toEqual(Array.from(bytes));
  });

  it("returns nothing, and does not throw, when the store cannot be read", async () => {
    const broken = {
      ...createMemoryRideStore(),
      loadRides: () => Promise.reject(new Error("storage is unavailable")),
    } as RideStore;

    expect(await restoreRides(broken)).toEqual([]);
  });
});
