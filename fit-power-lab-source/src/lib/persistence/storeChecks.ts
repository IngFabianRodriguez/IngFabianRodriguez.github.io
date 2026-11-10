import {
  MAX_RECENT_FILES,
  MAX_STORED_RIDES,
  type ProcessedActivity,
  type RecentFile,
  type RideStore,
  type StoredRide,
} from "@/lib/persistence/rideStore";

/**
 * The behavior every `RideStore` must have, as plain checks (no test framework) so the same
 * list runs against the in-memory store in Vitest and against the real IndexedDB store in a
 * browser, where jsdom cannot. Returns the names of the checks that failed, empty when all pass.
 */
export async function checkRideStore(
  create: () => Promise<RideStore> | RideStore,
): Promise<string[]> {
  const failures: string[] = [];

  async function check(name: string, run: (store: RideStore) => Promise<void>) {
    try {
      await run(await create());
    } catch (caught) {
      failures.push(`${name}: ${caught instanceof Error ? caught.message : String(caught)}`);
    }
  }

  function same(actual: unknown, expected: unknown, what: string) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new Error(`${what}: expected ${e}, got ${a}`);
  }

  const ride = (id: string, byte: number): StoredRide => ({
    id,
    fileName: `${id}.fit`,
    source: "fit",
    bytes: new Uint8Array([byte, byte + 1, byte + 2]),
    savedAt: byte,
  });
  const recent = (key: string, openedAt: number): RecentFile => ({
    key,
    fileName: key,
    sizeBytes: 10,
    startTime: 1,
    distanceM: 2,
    durationS: 3,
    openedAt,
  });
  const processed = (key: string): ProcessedActivity => ({
    key,
    fileName: `${key}.fit`,
    sizeBytes: 10,
    processedAt: 1,
  });

  await check("a new store is empty", async (store) => {
    same(await store.loadRides(), [], "rides");
    same(await store.listRecent(), [], "recent");
    same(await store.listProcessed(), [], "processed");
  });

  await check("rides come back oldest first with their bytes", async (store) => {
    await store.saveRide(ride("a", 1));
    await store.saveRide(ride("b", 10));
    const loaded = await store.loadRides();
    same(
      loaded.map((r) => r.id),
      ["a", "b"],
      "order",
    );
    same(Array.from(loaded[1]?.bytes ?? []), [10, 11, 12], "bytes");
    if (!(loaded[0]?.bytes instanceof Uint8Array)) throw new Error("bytes are not a Uint8Array");
    same(loaded[0]?.fileName, "a.fit", "name");
  });

  await check("saving a ride again replaces it and keeps its place", async (store) => {
    await store.saveRide(ride("a", 1));
    await store.saveRide(ride("b", 10));
    await store.saveRide(ride("a", 50));
    const loaded = await store.loadRides();
    same(
      loaded.map((r) => r.id),
      ["a", "b"],
      "order",
    );
    same(Array.from(loaded[0]?.bytes ?? []), [50, 51, 52], "bytes");
  });

  await check(`only the latest ${MAX_STORED_RIDES} rides are kept`, async (store) => {
    for (let i = 0; i < MAX_STORED_RIDES + 2; i++) await store.saveRide(ride(`r${i}`, i));
    const ids = (await store.loadRides()).map((r) => r.id);
    same(ids, ["r2", "r3", "r4", "r5", "r6"], "kept");
  });

  await check("a removed ride is forgotten", async (store) => {
    await store.saveRide(ride("a", 1));
    await store.saveRide(ride("b", 10));
    await store.removeRide("a");
    await store.removeRide("missing");
    same(
      (await store.loadRides()).map((r) => r.id),
      ["b"],
      "rides",
    );
  });

  await check(
    "recent files are listed newest first and a repeat moves to the top",
    async (store) => {
      await store.rememberRecent(recent("x", 1));
      await store.rememberRecent(recent("y", 2));
      await store.rememberRecent(recent("x", 3));
      const list = await store.listRecent();
      same(
        list.map((r) => r.key),
        ["x", "y"],
        "order",
      );
      same(list[0]?.openedAt, 3, "openedAt");
      same(list[0]?.distanceM, 2, "metadata");
    },
  );

  await check(`only the latest ${MAX_RECENT_FILES} recent files are kept`, async (store) => {
    for (let i = 0; i < MAX_RECENT_FILES + 3; i++) await store.rememberRecent(recent(`f${i}`, i));
    const list = await store.listRecent();
    same(list.length, MAX_RECENT_FILES, "count");
    same(list[0]?.key, `f${MAX_RECENT_FILES + 2}`, "newest");
  });

  await check("a recent file can be forgotten", async (store) => {
    await store.rememberRecent(recent("x", 1));
    await store.rememberRecent(recent("y", 2));
    await store.forgetRecent("x");
    same(
      (await store.listRecent()).map((r) => r.key),
      ["y"],
      "recent",
    );
  });

  await check("processed activities accumulate without repeats", async (store) => {
    await store.markProcessed([processed("p1"), processed("p2")]);
    await store.markProcessed([processed("p2"), processed("p3")]);
    const keys = (await store.listProcessed()).map((p) => p.key).sort();
    same(keys, ["p1", "p2", "p3"], "keys");
  });

  await check("listeners hear every change until they stop", async (store) => {
    let calls = 0;
    const stop = store.subscribe(() => {
      calls += 1;
    });
    await store.saveRide(ride("a", 1));
    await store.removeRide("a");
    await store.rememberRecent(recent("x", 1));
    await store.markProcessed([processed("p")]);
    same(calls, 4, "calls while subscribed");
    stop();
    await store.saveRide(ride("b", 2));
    same(calls, 4, "calls after stopping");
  });

  return failures;
}
