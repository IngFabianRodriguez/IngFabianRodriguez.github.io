import { act, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { useAppActions, type AppActions } from "@/app/AppContext";
import { decodeRideFile } from "@/domain/import/decode";
import { createMemoryRideStore } from "@/lib/persistence/memoryStore";
import { RideStoreProvider } from "@/lib/persistence/RideStoreContext";
import type { RideStore } from "@/lib/persistence/rideStore";
import { rememberSource } from "@/lib/persistence/sources";
import { useRidePersistence } from "@/lib/persistence/useRidePersistence";
import { buildFit } from "@/test/buildFit";
import { steadyRecords } from "@/test/fixtures";
import { renderWithApp } from "@/test/renderWithApp";

interface Handles {
  actions: AppActions;
  failed: boolean;
}

const current = {} as Handles;

function Probe() {
  const actions = useAppActions();
  const { failed } = useRidePersistence();
  useEffect(() => {
    current.actions = actions;
    current.failed = failed;
  });
  return null;
}

function setup(store: RideStore) {
  renderWithApp(
    <RideStoreProvider store={store}>
      <Probe />
    </RideStoreProvider>,
  );
  return current;
}

/** A ride as the picker hands it over: decoded from bytes, with the bytes remembered. */
function addFromBytes(handles: Handles, fileName: string, bytes: Uint8Array) {
  const decoded = decodeRideFile(fileName, bytes);
  rememberSource(decoded.fit, bytes);
  let id = "";
  act(() => {
    id = handles.actions.addRide({
      fileName,
      source: decoded.source,
      fit: decoded.fit,
      ride: decoded.ride,
    });
  });
  return id;
}

describe("useRidePersistence", () => {
  it("saves a ride that is added, with the original bytes and its name", async () => {
    const store = createMemoryRideStore();
    const handles = setup(store);
    const bytes = buildFit(steadyRecords(12));

    const id = addFromBytes(handles, "morning.fit", bytes);

    await waitFor(async () => expect(await store.loadRides()).toHaveLength(1));
    const [saved] = await store.loadRides();
    expect(saved?.id).toBe(id);
    expect(saved?.fileName).toBe("morning.fit");
    expect(saved?.source).toBe("fit");
    expect(Array.from(saved?.bytes ?? [])).toEqual(Array.from(bytes));
  });

  it("writes a FIT from the ride when the original bytes are not known", async () => {
    const store = createMemoryRideStore();
    const handles = setup(store);
    const decoded = decodeRideFile("other.fit", buildFit(steadyRecords(9)));

    act(() => {
      handles.actions.addRide({
        fileName: "other.fit",
        source: "merged",
        fit: decoded.fit,
        ride: decoded.ride,
      });
    });

    await waitFor(async () => expect(await store.loadRides()).toHaveLength(1));
    const [saved] = await store.loadRides();
    expect(saved?.source).toBe("merged");
    const again = decodeRideFile(saved?.fileName ?? "", saved?.bytes ?? new Uint8Array());
    expect(again.ride.samples).toHaveLength(9);
    expect(again.ride.samples[4]?.distance).toBe(decoded.ride.samples[4]?.distance);
  });

  it("remembers the file as recent and the activity as processed", async () => {
    const store = createMemoryRideStore();
    const handles = setup(store);
    const bytes = buildFit(steadyRecords(12));

    addFromBytes(handles, "morning.fit", bytes);

    await waitFor(async () => expect(await store.listRecent()).toHaveLength(1));
    const [recent] = await store.listRecent();
    expect(recent?.fileName).toBe("morning.fit");
    expect(recent?.sizeBytes).toBe(bytes.length);
    expect(recent?.distanceM).toBe(55);
    expect(recent?.startTime).toBe(new Date("2024-02-25T13:31:00Z").getTime());
    const processed = await store.listProcessed();
    expect(processed).toHaveLength(1);
    expect(processed[0]?.fileName).toBe("morning.fit");
    expect(processed[0]?.sizeBytes).toBe(bytes.length);
  });

  it("forgets a ride that is removed", async () => {
    const store = createMemoryRideStore();
    const handles = setup(store);
    const keep = addFromBytes(handles, "keep.fit", buildFit(steadyRecords(8)));
    const drop = addFromBytes(handles, "drop.fit", buildFit(steadyRecords(9)));
    await waitFor(async () => expect(await store.loadRides()).toHaveLength(2));

    act(() => handles.actions.removeRide(drop));

    await waitFor(async () => expect((await store.loadRides()).map((r) => r.id)).toEqual([keep]));
  });

  it("keeps only the latest 5 rides", async () => {
    const store = createMemoryRideStore();
    const handles = setup(store);
    const ids = Array.from({ length: 7 }, (_, i) =>
      addFromBytes(handles, `ride-${i}.fit`, buildFit(steadyRecords(6 + i))),
    );

    await waitFor(async () => expect(await store.loadRides()).toHaveLength(5));
    expect((await store.loadRides()).map((r) => r.id)).toEqual(ids.slice(2));
  });

  it("does not save again a ride that came from the store", async () => {
    const store = createMemoryRideStore();
    const handles = setup(store);
    const bytes = buildFit(steadyRecords(8));
    const decoded = decodeRideFile("old.fit", bytes);
    rememberSource(decoded.fit, bytes, { persisted: true });

    act(() => {
      handles.actions.addRide({
        id: "old",
        fileName: "old.fit",
        source: "fit",
        fit: decoded.fit,
        ride: decoded.ride,
      });
    });
    // Give the hook every chance to write; it must not.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(await store.loadRides()).toEqual([]);
    expect(await store.listRecent()).toEqual([]);
  });

  it("does not save the bundled sample ride", async () => {
    const store = createMemoryRideStore();
    const handles = setup(store);
    const decoded = decodeRideFile("sample.fit", buildFit(steadyRecords(8)));

    act(() => {
      handles.actions.addRide({
        fileName: "sample.fit",
        source: "sample",
        fit: decoded.fit,
        ride: decoded.ride,
      });
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(await store.loadRides()).toEqual([]);
  });

  it("reports a failure and keeps the app working when the store rejects", async () => {
    const store = {
      ...createMemoryRideStore(),
      saveRide: () => Promise.reject(new Error("quota exceeded")),
    } as RideStore;
    const handles = setup(store);

    addFromBytes(handles, "morning.fit", buildFit(steadyRecords(8)));

    await waitFor(() => expect(handles.failed).toBe(true));
  });
});
