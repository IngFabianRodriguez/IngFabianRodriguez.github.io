import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { RideStoreProvider } from "@/lib/persistence/RideStoreContext";
import { AppProvider, useAppState } from "@/app/AppContext";
import { activityKey, fileKey } from "@/domain/import/duplicates";
import { LibraryPanel } from "@/features/library/LibraryPanel";
import type { DirectoryHandle } from "@/features/library/folderScan";
import { activityFit, listFitBytes, namedFile } from "@/features/library/testData";
import { createMemoryRideStore } from "@/lib/persistence/memoryStore";
import { useRidePersistence } from "@/lib/persistence/useRidePersistence";
import type { RideStore } from "@/lib/persistence/rideStore";

vi.mock("leaflet", () => {
  const layer = () => {
    const fake = { addTo: () => fake };
    return fake;
  };
  return {
    map: () => ({ fitBounds: () => {}, remove: () => {} }),
    tileLayer: layer,
    polyline: layer,
    latLngBounds: () => ({}),
  };
});

const feb = activityFit({
  startTime: "2024-02-25T13:31:00Z",
  distanceM: 73349,
  elapsedS: 600,
  lat: 4.7,
  lon: -30.1,
});
const mar = activityFit({
  startTime: "2024-03-10T12:00:00Z",
  distanceM: 15000,
  elapsedS: 900,
  lat: 4.8,
  lon: -30.1,
});
const apr = activityFit({
  startTime: "2024-04-09T11:00:54Z",
  distanceM: 9000,
  elapsedS: 40,
  lat: 4.9,
  lon: -30.1,
});
const list = listFitBytes([
  { startTime: "2024-02-25T13:30:59Z", sizeBytes: feb.length },
  { startTime: "2024-04-09T11:00:53Z", sizeBytes: apr.length },
]);

const fileHandle = (name: string, bytes: Uint8Array) => ({
  kind: "file" as const,
  name,
  getFile: async () => namedFile(name, bytes),
});
const device = (entries: ReturnType<typeof fileHandle>[]): DirectoryHandle =>
  ({
    kind: "directory",
    name: "Activities",
    async *values() {
      for (const entry of entries) yield entry;
    },
  }) as DirectoryHandle;

const standard = () =>
  device([
    fileHandle("feb.fit", feb),
    fileHandle("mar.fit", mar),
    fileHandle("apr.fit", apr),
    fileHandle("List.fit", list),
  ]);

/** Lets a test see what is loaded without going through the panel. */
function LoadedNames() {
  const { rides, activeId } = useAppState();
  return (
    <p data-testid="loaded">
      {rides.map((r) => `${r.fileName}${r.id === activeId ? "*" : ""}`).join(",")}
    </p>
  );
}

function Persist() {
  useRidePersistence();
  return null;
}

interface SetupOptions {
  store?: RideStore;
  persist?: boolean;
  /** The folder the picker hands over; null means the browser has no picker. */
  handle?: DirectoryHandle | null | "cancel";
}

function setup({
  store = createMemoryRideStore(),
  persist = false,
  handle = standard(),
}: SetupOptions = {}) {
  const user = userEvent.setup();
  const picker = vi.fn(async () => {
    if (handle === "cancel") throw new DOMException("cancelled", "AbortError");
    return handle;
  });
  if (handle !== null)
    (window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker = picker;
  const { container } = render(
    <AppProvider initial={{ weights: { riderKg: 75, bikeKg: 5 } }}>
      <RideStoreProvider store={store}>
        {persist ? <Persist /> : null}
        <LibraryPanel />
        <LoadedNames />
      </RideStoreProvider>
    </AppProvider>,
  );
  return { user, store, picker, container };
}

const chooseFolder = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Choose device folder" }));
  await screen.findByRole("table", { name: /Activities in the device folder/ });
};

const deviceRow = (name: RegExp) =>
  within(screen.getByRole("table", { name: /Activities in the device folder/ })).getByRole("row", {
    name,
  });

afterEach(() => {
  delete (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker;
});

describe("LibraryPanel: device folder", () => {
  it("asks for the folder read only and lists its activities newest first with date, distance and duration", async () => {
    const { user, picker } = setup();

    await chooseFolder(user);

    expect(picker).toHaveBeenCalledWith({ mode: "read" });
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getAllByRole("cell").at(-1)?.textContent)).toEqual([
      "apr.fit",
      "mar.fit",
      "feb.fit",
    ]);
    expect(rows[0]).toHaveTextContent("9 km");
    expect(rows[0]).toHaveTextContent("0:40");
    expect(rows[2]).toHaveTextContent("73.3 km");
    expect(rows[2]).toHaveTextContent("10:00");
    expect(screen.getByText("3 activities found.")).toBeInTheDocument();
    expect(
      screen.getByText("List.fit read: 2 activities are listed on the device."),
    ).toBeInTheDocument();
  });

  it("uses a folder input where the browser has no folder picker", async () => {
    const { user } = setup({ handle: null });

    const input = screen.getByLabelText("Device folder");
    expect(input).toHaveAttribute("webkitdirectory");
    await user.upload(input, [
      namedFile("feb.fit", feb, "Activities/feb.fit"),
      namedFile("apr.fit", apr, "Activities/apr.fit"),
    ]);

    expect(await screen.findByText("2 activities found.")).toBeInTheDocument();
    expect(screen.getByText(/No List\.fit found/)).toBeInTheDocument();
  });

  it("does not report an error when the user cancels the folder picker", async () => {
    const { user } = setup({ handle: "cancel" });

    await user.click(screen.getByRole("button", { name: "Choose device folder" }));

    expect(screen.queryByText("The folder could not be read.")).not.toBeInTheDocument();
  });

  it("marks what List.fit lists as new and what it does not list as missing from it", async () => {
    const { user } = setup();
    await chooseFolder(user);

    expect(within(deviceRow(/apr\.fit/)).getByText("New")).toBeInTheDocument();
    expect(within(deviceRow(/feb\.fit/)).getByText("New")).toBeInTheDocument();
    expect(within(deviceRow(/mar\.fit/)).getByText("Not in List.fit")).toBeInTheDocument();
  });

  it("marks the activities an earlier session processed", async () => {
    const store = createMemoryRideStore();
    await store.markProcessed([
      {
        key: activityKey({ startTime: new Date("2024-02-25T13:31:00Z"), distanceM: 73349 }),
        fileName: "other-name.fit",
        sizeBytes: 1,
        processedAt: 1,
      },
      { key: "x", fileName: "apr.fit", sizeBytes: apr.length, processedAt: 1 },
    ]);
    const { user } = setup({ store });
    await chooseFolder(user);

    await waitFor(() =>
      expect(within(deviceRow(/feb\.fit/)).getByText("Processed before")).toBeInTheDocument(),
    );
    expect(within(deviceRow(/apr\.fit/)).getByText("Processed before")).toBeInTheDocument();
    expect(fileKey("apr.fit", apr.length)).toBe(`apr.fit|${apr.length}`);
  });

  it("selects the new activities and loads them, oldest first, so the latest is shown", async () => {
    const { user } = setup();
    await chooseFolder(user);

    await user.click(screen.getByRole("button", { name: "Select new" }));
    expect(screen.getByRole("checkbox", { name: "Select apr.fit" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select feb.fit" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select mar.fit" })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Load selected (2)" }));

    await waitFor(() => expect(screen.getByTestId("loaded")).toHaveTextContent("feb.fit,apr.fit*"));
    expect(within(deviceRow(/apr\.fit/)).getByText("Already loaded")).toBeInTheDocument();
  });

  it("loads any activities that are ticked by hand", async () => {
    const { user } = setup();
    await chooseFolder(user);

    await user.click(screen.getByRole("checkbox", { name: "Select mar.fit" }));
    await user.click(screen.getByRole("button", { name: "Load selected (1)" }));

    await waitFor(() => expect(screen.getByTestId("loaded")).toHaveTextContent("mar.fit*"));
  });

  it("warns, without stopping, when selected activities were loaded before", async () => {
    const { user } = setup();
    await chooseFolder(user);
    await user.click(screen.getByRole("checkbox", { name: "Select feb.fit" }));
    await user.click(screen.getByRole("button", { name: "Load selected (1)" }));
    await waitFor(() => expect(screen.getByTestId("loaded")).toHaveTextContent("feb.fit"));

    await user.click(screen.getByRole("checkbox", { name: "Select feb.fit" }));

    expect(
      screen.getByText(/1 of the selected activities were loaded or processed before/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Load selected (1)" }));
    await waitFor(() => expect(screen.getByTestId("loaded")).toHaveTextContent("feb.fit,feb.fit"));
  });

  it("flags the same activity stored twice in the folder", async () => {
    const { user } = setup({
      handle: device([fileHandle("one.fit", feb), fileHandle("two.fit", feb)]),
    });
    await chooseFolder(user);

    expect(screen.getAllByText("Duplicate in folder")).toHaveLength(2);
  });

  it("says when the folder has no ride files and leaves out files it cannot read", async () => {
    const { user } = setup({ handle: device([fileHandle("notes.txt", new Uint8Array(3))]) });
    await user.click(screen.getByRole("button", { name: "Choose device folder" }));
    expect(await screen.findByText("No ride files were found in that folder.")).toBeInTheDocument();
  });

  it("counts the files that were left out because they are not activities", async () => {
    const { user } = setup({
      handle: device([fileHandle("feb.fit", feb), fileHandle("broken.fit", new Uint8Array(300))]),
    });
    await chooseFolder(user);

    expect(
      screen.getByText("1 files could not be read as activities and were left out."),
    ).toBeInTheDocument();
  });
});

describe("LibraryPanel: loaded rides", () => {
  async function withTwoRides() {
    const ctx = setup();
    await chooseFolder(ctx.user);
    await ctx.user.click(screen.getByRole("checkbox", { name: "Select feb.fit" }));
    await ctx.user.click(screen.getByRole("checkbox", { name: "Select apr.fit" }));
    await ctx.user.click(screen.getByRole("button", { name: "Load selected (2)" }));
    await screen.findByRole("table", { name: "Rides loaded in this session" });
    await waitFor(() => expect(screen.getByTestId("loaded")).toHaveTextContent("feb.fit,apr.fit*"));
    return ctx;
  }

  it("says there are no rides before any is loaded", () => {
    setup();
    expect(screen.getByText("No rides loaded yet.")).toBeInTheDocument();
  });

  it("lets the user show a ride and remove another", async () => {
    const { user } = await withTwoRides();

    await user.click(screen.getByRole("button", { name: "Show feb.fit" }));
    expect(screen.getByTestId("loaded")).toHaveTextContent("feb.fit*,apr.fit");
    expect(screen.getByRole("button", { name: "Showing feb.fit" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Remove apr.fit" }));
    expect(screen.getByTestId("loaded")).toHaveTextContent(/^feb\.fit\*$/);
  });

  it(
    "compares the shown ride with another and can stop comparing",
    { timeout: 20000 },
    async () => {
      const { user } = await withTwoRides();
      expect(
        screen.getByRole("button", { name: "Compare apr.fit with the ride shown" }),
      ).toBeDisabled();

      await user.click(screen.getByRole("button", { name: "Compare feb.fit with the ride shown" }));

      expect(await screen.findByRole("table", { name: /Main figures/ })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "Loaded rides" })).toBeInTheDocument();
      expect(
        await screen.findByRole("region", { name: "Comparison map" }, { timeout: 5000 }),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Comparing feb.fit with the ride shown" }),
      );
      expect(screen.queryByRole("table", { name: /Main figures/ })).not.toBeInTheDocument();
    },
  );

  it(
    "has no automatically detectable accessibility violations with rides and a comparison",
    { timeout: 20000 },
    async () => {
      const { user, container } = await withTwoRides();
      await user.click(screen.getByRole("button", { name: "Compare feb.fit with the ride shown" }));
      await screen.findByRole("region", { name: "Comparison map" }, { timeout: 5000 });

      expect(await axe(container)).toHaveNoViolations();
    },
  );
});

describe("LibraryPanel: recent files", () => {
  it("lists recent files, newest first, with the metadata only", async () => {
    const store = createMemoryRideStore();
    await store.rememberRecent({
      key: "old.fit|10",
      fileName: "old.fit",
      sizeBytes: 10,
      startTime: Date.UTC(2024, 0, 5),
      distanceM: 12000,
      durationS: 100,
      openedAt: 1,
    });
    await store.rememberRecent({
      key: "new.fit|10",
      fileName: "new.fit",
      sizeBytes: 10,
      startTime: null,
      distanceM: null,
      durationS: null,
      openedAt: 2,
    });
    setup({ store });

    const items = await screen.findAllByRole("listitem");
    expect(items.map((i) => i.querySelector("p")?.textContent)).toEqual(["new.fit", "old.fit"]);
    expect(items[1]).toHaveTextContent("12 km");
  });

  it("reopens a file whose bytes are still stored, and says when they are not", async () => {
    const store = createMemoryRideStore();
    await store.saveRide({
      id: "kept",
      fileName: "kept.fit",
      source: "fit",
      bytes: feb,
      savedAt: 1,
    });
    for (const name of ["kept.fit", "gone.fit"]) {
      await store.rememberRecent({
        key: `${name}|1`,
        fileName: name,
        sizeBytes: 1,
        startTime: null,
        distanceM: null,
        durationS: null,
        openedAt: name === "kept.fit" ? 2 : 1,
      });
    }
    const { user } = setup({ store });

    const open = await screen.findByRole("button", { name: "Open kept.fit" });
    expect(screen.getByRole("button", { name: "Open gone.fit" })).toBeDisabled();
    expect(screen.getByText("Not kept. Choose the file again to open it.")).toBeInTheDocument();
    await user.click(open);

    await waitFor(() => expect(screen.getByTestId("loaded")).toHaveTextContent("kept.fit*"));
  });

  it("shows a file as recent after it is loaded from the device folder", async () => {
    const { user } = setup({ persist: true });
    await chooseFolder(user);
    await user.click(screen.getByRole("checkbox", { name: "Select apr.fit" }));
    await user.click(screen.getByRole("button", { name: "Load selected (1)" }));

    const recent = await screen.findByRole("button", { name: "Open apr.fit" });
    expect(recent).toBeEnabled();
    await waitFor(() =>
      expect(within(deviceRow(/apr\.fit/)).getByText("Already loaded")).toBeInTheDocument(),
    );
  });
});
