import { describe, expect, it } from "vitest";
import { createMemoryRideStore } from "@/lib/persistence/memoryStore";
import { checkRideStore } from "@/lib/persistence/storeChecks";

describe("in-memory ride store", () => {
  it("behaves as a ride store must", async () => {
    expect(await checkRideStore(() => createMemoryRideStore())).toEqual([]);
  });

  it("does not share bytes with the caller, so later changes cannot corrupt what was saved", async () => {
    const store = createMemoryRideStore();
    const bytes = new Uint8Array([1, 2, 3]);

    await store.saveRide({ id: "a", fileName: "a.fit", source: "fit", bytes, savedAt: 1 });
    bytes[0] = 99;
    const [loaded] = await store.loadRides();
    if (loaded) loaded.bytes[1] = 77;

    expect(Array.from((await store.loadRides())[0]?.bytes ?? [])).toEqual([1, 2, 3]);
  });
});
