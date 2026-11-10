import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import type { AppState } from "@/app/appState";
import { estimatePower } from "@/domain/power";
import { ModelPanel } from "@/features/model/ModelPanel";
import { messages } from "@/features/model/messages";
import type { RecordInput } from "@/test/buildFit";
import { makeLoadedRide, steadyRecords } from "@/test/fixtures";
import { renderWithApp } from "@/test/renderWithApp";

const weights = { riderKg: 75, bikeKg: 5 };

function stateWith(records: RecordInput[] = steadyRecords(40), extra: Partial<AppState> = {}) {
  const loaded = makeLoadedRide(records);
  return { weights, rides: [loaded], activeId: loaded.id, ...extra };
}

/** A ride whose heart rate follows the estimated power exactly, except for one stretch. */
function heartRateRide(): RecordInput[] {
  const base = steadyRecords(600, (i) => ({
    speed: 4 + 0.5 * Math.floor(i / 60),
    distance: 0,
    heartRate: 100,
  }));
  let d = 0;
  for (const r of base) {
    d += r.speed ?? 0;
    r.distance = d;
  }
  const loaded = makeLoadedRide(base);
  const watts = estimatePower(loaded.ride, { ...weightsParams(), ...paramsDefaults() });
  return base.map((r, i) => ({
    ...r,
    heartRate: Math.round(60 + 0.4 * (watts[i] ?? 0) + (i >= 300 && i < 360 ? 25 : 0)),
  }));
}
const weightsParams = () => ({ riderMassKg: weights.riderKg, bikeMassKg: weights.bikeKg });
const paramsDefaults = () => ({ crr: 0.006, cdA: 0.4, drivetrainEfficiency: 0.975 });

describe("ModelPanel", () => {
  it("shows the base parameters with the default posture and surface already chosen", () => {
    renderWithApp(<ModelPanel />);

    expect(screen.getByLabelText("Drag area CdA (m²)")).toHaveValue("0.4");
    expect(screen.getByLabelText("Rolling resistance Crr")).toHaveValue("0.006");
    expect(screen.getByLabelText("Drivetrain efficiency (%)")).toHaveValue("97.5");
    expect(screen.getByRole("radio", { name: /Hands up/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Asphalt/ })).toBeChecked();
  });

  it("asks for a ride where a card needs one, without breaking the others", () => {
    renderWithApp(<ModelPanel />);

    expect(screen.getAllByText("Load a ride and confirm your weights to use this.").length).toBe(5);
    expect(
      screen.getByText(/Load a ride and confirm your weights to see the estimate/),
    ).toBeVisible();
    expect(screen.getByLabelText("Wind speed (km/h)")).toBeVisible();
  });

  it("moves the live estimate when a value is typed (CdA 0.4 gives 56 W, 0.2 gives 40 W)", async () => {
    const user = userEvent.setup();
    renderWithApp(<ModelPanel />, stateWith());
    expect(screen.getAllByText("56 W").length).toBeGreaterThanOrEqual(2);

    const cda = screen.getByLabelText("Drag area CdA (m²)");
    await user.clear(cda);
    await user.type(cda, "0.2");

    expect(cda).toHaveValue("0.2");
    const summary = screen.getByText("Live estimate").closest("[data-slot=card]") as HTMLElement;
    expect(within(summary).getAllByText("40 W")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: /Hands up/ })).not.toBeChecked();
  });

  it("flags a value outside its range and does not apply it", async () => {
    const user = userEvent.setup();
    renderWithApp(<ModelPanel />, stateWith());

    const cda = screen.getByLabelText("Drag area CdA (m²)");
    await user.clear(cda);
    await user.type(cda, "9");

    expect(cda).toBeInvalid();
    expect(screen.getByText("Enter a number from 0.05 to 1.5.")).toBeVisible();
    const summary = screen.getByText("Live estimate").closest("[data-slot=card]") as HTMLElement;
    expect(within(summary).getAllByText("56 W")).toHaveLength(2);
  });

  it("sets the drag area and the rolling resistance from the presets", async () => {
    const user = userEvent.setup();
    renderWithApp(<ModelPanel />);

    await user.click(screen.getByRole("radio", { name: /Low grip/ }));
    await user.click(screen.getByRole("radio", { name: /Gravel/ }));

    expect(screen.getByLabelText("Drag area CdA (m²)")).toHaveValue("0.32");
    expect(screen.getByLabelText("Rolling resistance Crr")).toHaveValue("0.01");
    expect(screen.getByRole("radio", { name: /Low grip/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Gravel/ })).toBeChecked();
  });

  it("reads wind in the units of the user and stores it in m/s", async () => {
    const user = userEvent.setup();
    renderWithApp(<ModelPanel />, { units: "imperial" });

    await user.click(screen.getByRole("radio", { name: /Moderate breeze/ }));

    // 5 m/s is 18 km/h, 11.2 mph.
    expect(screen.getByLabelText("Wind speed (mph)")).toHaveValue("11.2");
  });

  it("applies a headwind to a ride with GPS positions and tells when there are none", async () => {
    const user = userEvent.setup();
    const north = steadyRecords(40, (i) => ({
      lat: 4.7 + (5 * i) / 111_195,
      lon: -30.1,
    }));
    renderWithApp(<ModelPanel />, stateWith(north));

    await user.click(screen.getByRole("radio", { name: /Fresh breeze/ }));

    expect(screen.getByText(/The wind acts on \d+ of 40 samples/)).toBeVisible();
    const summary = screen.getByText("Live estimate").closest("[data-slot=card]") as HTMLElement;
    // 8 m/s from the north against a rider heading north at 5 m/s: far more than 56 W.
    expect(within(summary).queryByText("56 W")).not.toBeInTheDocument();
  });

  it("says the wind has no effect on a ride without GPS positions", async () => {
    const user = userEvent.setup();
    const loaded = makeLoadedRide(steadyRecords(40));
    const noGps = {
      ...loaded,
      ride: {
        ...loaded.ride,
        samples: loaded.ride.samples.map(({ lat: _lat, lon: _lon, ...rest }) => rest),
      },
    };
    renderWithApp(<ModelPanel />, { weights, rides: [noGps], activeId: noGps.id });

    await user.click(screen.getByRole("radio", { name: /Moderate breeze/ }));

    expect(
      screen.getByText("This ride has no GPS positions, so the wind has no effect on it."),
    ).toBeVisible();
    const summary = screen.getByText("Live estimate").closest("[data-slot=card]") as HTMLElement;
    expect(within(summary).getAllByText("56 W")).toHaveLength(2);
  });

  it("turns braking detection on and counts the braking events of the ride", async () => {
    const user = userEvent.setup();
    const records = steadyRecords(40, (i) => ({ speed: i === 20 ? 2 : 5 }));
    renderWithApp(<ModelPanel />, stateWith(records));

    const toggle = screen.getByRole("switch", { name: "Detect braking" });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);

    expect(toggle).toBeChecked();
    expect(screen.getByText("Braking events in this ride: 1")).toBeVisible();
  });

  it("shows the temperature correction in the units of the user and how it changes the air", () => {
    renderWithApp(<ModelPanel />, { ...stateWith(), units: "imperial" });

    expect(screen.getByLabelText("Temperature correction (°F)")).toBeVisible();
    expect(screen.getByText(/Device average 59 °F/)).toBeVisible();
    expect(screen.getByText(/standard atmosphere for the altitude is used/)).toBeVisible();
  });

  it("reports the pressure samples when the ride carries pressure", () => {
    const loaded = makeLoadedRide(steadyRecords(10));
    for (const m of loaded.fit.messages)
      if (m.mesgNum === 20) m.fields["absolutePressure"] = 101325;
    const ride = {
      ...loaded,
      ride: {
        ...loaded.ride,
        samples: loaded.ride.samples.map((s) => ({ ...s, pressurePa: 101325 })),
      },
    };
    renderWithApp(<ModelPanel />, { weights, rides: [ride], activeId: ride.id });

    expect(screen.getByText(/10 samples carry a real pressure/)).toBeVisible();
  });

  it("applies a group preset to the drag (alone 56 W, inside a bunch 40 W)", async () => {
    const user = userEvent.setup();
    renderWithApp(<ModelPanel />, stateWith());

    await user.click(screen.getByRole("radio", { name: /Inside a bunch/ }));

    expect(screen.getByLabelText("Drag multiplier (1 = alone)")).toHaveValue("0.5");
    expect(screen.getByText("Drag reduced by 50%")).toBeVisible();
    const summary = screen.getByText("Live estimate").closest("[data-slot=card]") as HTMLElement;
    expect(within(summary).getAllByText("40 W")).toHaveLength(2);
  });

  describe("calibration", () => {
    it("computes the factor from a known power and applies it to every watt", async () => {
      const user = userEvent.setup();
      renderWithApp(<ModelPanel />, stateWith());

      expect(screen.getByRole("button", { name: "Apply factor" })).toBeDisabled();
      await user.type(screen.getByLabelText("Known average power (W)"), "112");

      expect(
        screen.getByText("Estimated 56 W against known 112 W gives a factor of 2."),
      ).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Apply factor" }));

      expect(screen.getByText("Current factor: 2")).toBeVisible();
      // The watts are whole numbers, so 55.55 W scaled by 2 is shown as 111 W, not 112 W.
      const summary = screen.getByText("Live estimate").closest("[data-slot=card]") as HTMLElement;
      expect(within(summary).getAllByText("111 W")).toHaveLength(2);

      await user.click(screen.getByRole("button", { name: "Remove calibration" }));
      expect(screen.getByText("Current factor: 1")).toBeVisible();
      expect(within(summary).getAllByText("56 W")).toHaveLength(2);
    });

    it("uses the stretch selected on the charts", () => {
      renderWithApp(
        <ModelPanel />,
        stateWith(steadyRecords(40), { range: { fromKm: 0.05, toKm: 0.1 } }),
      );

      expect(screen.getByText("Stretch: 0.05 km to 0.1 km (selected on the charts)")).toBeVisible();
    });

    it("warns when the factor is far from 1", async () => {
      const user = userEvent.setup();
      renderWithApp(<ModelPanel />, stateWith());

      await user.type(screen.getByLabelText("Known average power (W)"), "900");

      expect(screen.getByText(/This factor is far from 1/)).toBeVisible();
    });
  });

  it("says a coast-down needs steady coasting when the ride has none", () => {
    renderWithApp(<ModelPanel />, stateWith());

    expect(screen.getByText(/Not enough steady coasting/)).toBeVisible();
  });

  it("previews the uncertainty band with its low, estimate and high power (43, 56 and 69 W)", () => {
    renderWithApp(<ModelPanel />, stateWith());

    const card = screen.getByText("Uncertainty band").closest("[data-slot=card]") as HTMLElement;
    const row = within(card).getByRole("row", { name: /Average pedalling power/ });
    expect(within(row).getByText("43 W")).toBeVisible();
    expect(within(row).getByText("56 W")).toBeVisible();
    expect(within(row).getByText("69 W")).toBeVisible();
    expect(within(card).getByRole("img", { name: /uncertainty band/ })).toBeInTheDocument();
  });

  describe("power and heart rate", () => {
    it("says no relation can be read when the power does not vary", () => {
      renderWithApp(<ModelPanel />, stateWith());

      expect(screen.getByText(/No relation can be read/)).toBeVisible();
    });

    it("shows the learned relation and selects a stretch that does not follow it", async () => {
      const user = userEvent.setup();
      renderWithApp(<ModelPanel />, stateWith(heartRateRide()));

      expect(screen.getByText(/bpm per 100 W/)).toBeVisible();
      const button = await screen.findByRole("button", { name: /Select the stretch/ });
      await user.click(button);

      expect(screen.getByText(/Selected stretch:/)).toBeVisible();
    });
  });

  describe("measured against estimated", () => {
    it("says the file carries no measured power when it does not", () => {
      renderWithApp(<ModelPanel />, stateWith());

      expect(screen.getByText("This file carries no measured power.")).toBeVisible();
    });

    it("shows the error figures when the file carries power", () => {
      renderWithApp(<ModelPanel />, stateWith(steadyRecords(40, () => ({ power: 100 }))));

      const card = screen
        .getByText("Measured against estimated")
        .closest("[data-slot=card]") as HTMLElement;
      const bias = within(card).getByRole("row", { name: /Bias/ });
      expect(within(bias).getByText("-44 W (-44%)")).toBeVisible();
      expect(within(card).getByRole("row", { name: /Samples compared/ })).toHaveTextContent("40");
    });
  });

  describe("learned correction", () => {
    it("says so when no loaded ride carries measured power", () => {
      renderWithApp(<ModelPanel />, stateWith());

      expect(screen.getByText(/No loaded ride carries measured power/)).toBeVisible();
    });

    it("learns a scale from rides with measured power and applies it", async () => {
      const user = userEvent.setup();
      renderWithApp(<ModelPanel />, stateWith(steadyRecords(40, () => ({ power: 112 }))));

      expect(
        screen.getByText("Learned from 1 rides and 40 samples: multiply the estimate by 2."),
      ).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Apply to the model" }));

      expect(screen.getByText("Current factor: 2")).toBeVisible();
    });
  });

  it("restores every value with the reset button", async () => {
    const user = userEvent.setup();
    renderWithApp(<ModelPanel />, stateWith());
    await user.click(screen.getByRole("radio", { name: /Dirt road/ }));
    await user.click(screen.getByRole("radio", { name: /Inside a bunch/ }));
    await user.click(screen.getByRole("switch", { name: "Detect braking" }));

    await user.click(screen.getByRole("button", { name: "Reset model" }));

    expect(screen.getByLabelText("Rolling resistance Crr")).toHaveValue("0.006");
    expect(screen.getByLabelText("Drag multiplier (1 = alone)")).toHaveValue("1");
    expect(screen.getByRole("switch", { name: "Detect braking" })).not.toBeChecked();
  });

  it("speaks Spanish when the app does", () => {
    renderWithApp(<ModelPanel />, { locale: "es" });

    expect(screen.getByRole("heading", { name: "Modelo de potencia" })).toBeVisible();
    expect(screen.getByLabelText("Área de arrastre CdA (m²)")).toBeVisible();
    expect(screen.getByRole("radio", { name: /Grava/ })).toBeVisible();
  });

  it("has the same texts in English and Spanish", () => {
    expect(Object.keys(messages.es).sort()).toEqual(Object.keys(messages.en).sort());
  });

  it("has no accessibility violations, with and without a ride", async () => {
    const empty = renderWithApp(<ModelPanel />);
    expect(await axe(empty.container)).toHaveNoViolations();
    empty.unmount();

    const full = renderWithApp(<ModelPanel />, stateWith());
    expect(await axe(full.container)).toHaveNoViolations();
  });
});
