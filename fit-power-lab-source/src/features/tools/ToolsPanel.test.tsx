import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAppState } from "@/app/AppContext";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { rideFromFit } from "@/domain/ride";
import { MESG_SESSION } from "@/domain/tools/fitMesgNums";
import { buildActivityFit } from "@/domain/tools/testing";
import { ToolsPanel } from "@/features/tools/ToolsPanel";
import { readFit } from "@/fit/readFit";
import { renderWithApp } from "@/test/renderWithApp";
import { steadyRecords } from "@/test/fixtures";
import type { LoadedRide } from "@/app/appState";

const T0 = new Date("2024-02-25T13:31:00Z").getTime();

function loaded(fileName: string, startS = 0, count = 40, id = fileName): LoadedRide {
  const records = steadyRecords(count, (i) => ({ timestamp: new Date(T0 + (startS + i) * 1000) }));
  const fit = readFit(buildActivityFit(records));
  return { id, fileName, source: "fit", fit, ride: rideFromFit(fit), loadedAt: 0 };
}

/** Lists the rides in the app state, so a test can see what a tool added. */
function RideList() {
  const { rides, activeId } = useAppState();
  return (
    <ul aria-label="loaded">
      {rides.map((r) => (
        <li
          key={r.id}
        >{`${r.fileName}|${r.source}|${r.ride.samples.length}|${r.id === activeId}`}</li>
      ))}
    </ul>
  );
}

/** The distance and elapsed time that the last loaded ride's session message declares. */
function LastSession() {
  const { rides } = useAppState();
  const session = rides.at(-1)?.fit.messages.find((m) => m.mesgNum === MESG_SESSION);
  return (
    <p data-testid="last-session">
      {`${String(session?.fields["totalDistance"])}|${String(session?.fields["totalElapsedTime"])}`}
    </p>
  );
}

const renderPanel = (state: Parameters<typeof renderWithApp>[1]) =>
  renderWithApp(
    <>
      <ToolsPanel />
      <RideList />
      <LastSession />
    </>,
    state,
  );
const rideLines = () =>
  within(screen.getByRole("list", { name: "loaded" })).getAllByRole("listitem");

afterEach(() => vi.unstubAllGlobals());

describe("ToolsPanel", () => {
  it("asks for a ride first when none is loaded and leaves the tools disabled", () => {
    renderPanel({});

    expect(screen.getByText(/load a ride first/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create trimmed ride/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /smooth the gps track/i })).toBeDisabled();
  });

  describe("trim", () => {
    it("adds a trimmed ride made from the km typed, and makes it the active one", async () => {
      const user = userEvent.setup();
      const ride = loaded("a.fit");
      renderPanel({ rides: [ride], activeId: ride.id });

      await user.type(screen.getByLabelText(/^from/i), "0.05");
      await user.type(screen.getByLabelText(/^to/i), "0.1");
      await user.click(screen.getByRole("button", { name: /create trimmed ride/i }));

      expect(await screen.findByRole("status")).toHaveTextContent('"a-trimmed.fit"');
      expect(rideLines().map((l) => l.textContent)).toEqual([
        "a.fit|fit|40|false",
        "a-trimmed.fit|fit|11|true",
      ]);
    });

    it("uses the range selected on a chart when asked", async () => {
      const user = userEvent.setup();
      const ride = loaded("a.fit");
      renderPanel({ rides: [ride], activeId: ride.id, range: { fromKm: 0.1, toKm: 0.15 } });

      await user.click(screen.getByRole("checkbox", { name: /use the selected range/i }));
      expect(screen.getByLabelText(/^from/i)).toBeDisabled();
      await user.click(screen.getByRole("button", { name: /create trimmed ride/i }));

      expect(await screen.findByRole("status")).toBeInTheDocument();
      expect(rideLines().at(-1)?.textContent).toBe("a-trimmed.fit|fit|11|true");
    });

    it("disables the selected-range option when nothing is selected", () => {
      const ride = loaded("a.fit");
      renderPanel({ rides: [ride], activeId: ride.id });

      expect(screen.getByRole("checkbox", { name: /use the selected range/i })).toBeDisabled();
    });

    it("can remove the pauses", async () => {
      const user = userEvent.setup();
      const records = steadyRecords(40, (i) => ({
        speed: i >= 10 && i < 30 ? 0 : 5,
        distance: 5 * (i < 10 ? i : i < 30 ? 10 : i - 20),
      }));
      const fit = readFit(buildActivityFit(records));
      const ride: LoadedRide = {
        id: "p",
        fileName: "p.fit",
        source: "fit",
        fit,
        ride: rideFromFit(fit),
        loadedAt: 0,
      };
      renderPanel({ rides: [ride], activeId: "p" });

      await user.click(screen.getByRole("switch", { name: /remove pauses/i }));
      await user.click(screen.getByRole("button", { name: /create trimmed ride/i }));

      await screen.findByRole("status");
      expect(rideLines().at(-1)?.textContent).toBe("p-trimmed.fit|fit|20|true");
    });

    it("says so when nothing is left", async () => {
      const user = userEvent.setup();
      const ride = loaded("a.fit");
      renderPanel({ rides: [ride], activeId: ride.id });

      await user.type(screen.getByLabelText(/^from/i), "50");
      await user.click(screen.getByRole("button", { name: /create trimmed ride/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/no record is left/i);
      expect(rideLines()).toHaveLength(1);
    });

    it("reads the distances in miles when the units are imperial", async () => {
      const user = userEvent.setup();
      const ride = loaded("a.fit");
      renderPanel({ rides: [ride], activeId: ride.id, units: "imperial" });

      // 0.0621 mi is 0.1 km: the ride keeps the records from 100 m on, which are 20 of 40.
      await user.type(screen.getByLabelText(/^from \(mi\)/i), "0.0621371");
      await user.click(screen.getByRole("button", { name: /create trimmed ride/i }));

      await screen.findByRole("status");
      expect(rideLines().at(-1)?.textContent).toBe("a-trimmed.fit|fit|20|true");
    });
  });

  describe("merge", () => {
    it("needs two rides", () => {
      const ride = loaded("a.fit");
      renderPanel({ rides: [ride], activeId: ride.id });

      expect(screen.getByText(/at least two rides/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /merge 0 rides/i })).toBeDisabled();
    });

    it("merges the ticked rides into one with source merged", async () => {
      const user = userEvent.setup();
      const rides = [loaded("a.fit"), loaded("b.fit", 3600, 20), loaded("c.fit", 7200, 5)];
      renderPanel({ rides, activeId: "c.fit" });

      await user.click(screen.getByRole("checkbox", { name: /^b\.fit/ }));
      await user.click(screen.getByRole("checkbox", { name: /^a\.fit/ }));
      await user.click(screen.getByRole("button", { name: /merge 2 rides/i }));

      expect(await screen.findByRole("status")).toHaveTextContent('"a-merged.fit"');
      expect(rideLines().at(-1)?.textContent).toBe("a-merged.fit|merged|60|true");
      expect(rideLines()).toHaveLength(4);
    });

    it("says so when the rides overlap in time", async () => {
      const user = userEvent.setup();
      const rides = [loaded("a.fit"), loaded("b.fit", 10)];
      renderPanel({ rides, activeId: "a.fit" });

      await user.click(screen.getByRole("checkbox", { name: /^a\.fit/ }));
      await user.click(screen.getByRole("checkbox", { name: /^b\.fit/ }));
      await user.click(screen.getByRole("button", { name: /merge 2 rides/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/overlap/i);
      expect(rideLines()).toHaveLength(2);
    });
  });

  describe("altitude and GPS", () => {
    it("smooths the GPS track into a new ride without any network request", async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const ride = loaded("a.fit");
      renderPanel({ rides: [ride], activeId: ride.id });

      await user.click(screen.getByRole("button", { name: /smooth the gps track/i }));

      expect(await screen.findByRole("status")).toHaveTextContent('"a-smoothed.fit"');
      expect(rideLines().at(-1)?.textContent).toBe("a-smoothed.fit|fit|40|true");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("shows the privacy warning from the start and sends nothing before the confirmation", async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const ride = loaded("a.fit");
      renderPanel({ rides: [ride], activeId: ride.id });

      expect(screen.getByText(/sends the coordinates of this route/i)).toBeVisible();
      await user.click(screen.getByRole("button", { name: /correct altitude online/i }));

      expect(screen.getByText(/about to send 40 coordinates/i)).toBeVisible();
      expect(fetchMock).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: /^cancel$/i }));
      expect(fetchMock).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /correct altitude online/i })).toBeInTheDocument();
    });

    it("asks the elevation service after the confirmation and adds the corrected ride", async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn(async (url: string) => {
        const count = new URL(url).searchParams.get("latitude")?.split(",").length ?? 0;
        return {
          ok: true,
          status: 200,
          json: async () => ({ elevation: Array(count).fill(3100) }),
        } as Response;
      });
      vi.stubGlobal("fetch", fetchMock);
      const ride = loaded("a.fit");
      renderPanel({ rides: [ride], activeId: ride.id });

      await user.click(screen.getByRole("button", { name: /correct altitude online/i }));
      await user.click(screen.getByRole("button", { name: /send coordinates/i }));

      expect(await screen.findByRole("status")).toHaveTextContent('"a-elevation.fit"');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(String(fetchMock.mock.calls[0]?.[0])).toContain("api.open-meteo.com/v1/elevation");
      expect(rideLines().at(-1)?.textContent).toBe("a-elevation.fit|fit|40|true");
    });

    it("reports a service failure and adds nothing", async () => {
      const user = userEvent.setup();
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
      const ride = loaded("a.fit");
      renderPanel({ rides: [ride], activeId: ride.id });

      await user.click(screen.getByRole("button", { name: /correct altitude online/i }));
      await user.click(screen.getByRole("button", { name: /send coordinates/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/did not answer/i);
      expect(rideLines()).toHaveLength(1);
    });

    it("disables both tools for a ride without GPS", () => {
      const fit = readFit(
        buildActivityFit(
          steadyRecords(10, () => ({ lat: undefined as never, lon: undefined as never })),
        ),
      );
      const ride: LoadedRide = {
        id: "i",
        fileName: "indoor.fit",
        source: "fit",
        fit,
        ride: rideFromFit(fit),
        loadedAt: 0,
      };
      renderPanel({ rides: [ride], activeId: "i" });

      expect(screen.getByRole("button", { name: /smooth the gps track/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /correct altitude online/i })).toBeDisabled();
      expect(screen.getByRole("alert")).toHaveTextContent(/no gps positions/i);
    });
  });

  it("adds a ride whose session totals match its records, and leaves the original alone", async () => {
    const user = userEvent.setup();
    const ride = loaded("a.fit");
    renderPanel({ rides: [ride], activeId: ride.id });

    await user.type(screen.getByLabelText(/^from/i), "0.05");
    await user.click(screen.getByRole("button", { name: /create trimmed ride/i }));

    await waitFor(() => expect(rideLines()).toHaveLength(2));
    // Records from 50 m on: 30 of them, 145 m apart from first to last, 29 s long.
    expect(screen.getByTestId("last-session")).toHaveTextContent("145|29");
    expect(ride.fit.messages.find((m) => m.mesgNum === MESG_SESSION)?.fields["totalDistance"]).toBe(
      99999,
    );
  });

  it("has no accessibility violations", async () => {
    const ride = loaded("a.fit");
    const { container } = renderPanel({ rides: [ride, loaded("b.fit", 3600)], activeId: ride.id });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("speaks Spanish when the locale is Spanish", () => {
    const ride = loaded("a.fit");
    renderPanel({ rides: [ride], activeId: ride.id, locale: "es" });

    expect(screen.getByRole("button", { name: "Crear recorrido recortado" })).toBeInTheDocument();
    expect(screen.getByText("Aviso de privacidad")).toBeInTheDocument();
  });
});
