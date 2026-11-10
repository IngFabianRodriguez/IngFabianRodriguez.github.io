import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "@/App";
import { buildFit } from "@/test/buildFit";
import { ONBOARDING_STORAGE_KEY } from "@/features/help/useOnboarding";
import { getDefaultRideStore, resetDefaultRideStore } from "@/lib/persistence/defaultStore";
import { loadWeights, saveWeights } from "@/lib/weightsStorage";
import { steadyRecords } from "@/test/fixtures";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    // The introduction opens on the first visit and would cover the page in every test.
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ seen: true }));
    resetDefaultRideStore();
  });

  it("renders the app title", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "FIT power lab" })).toBeInTheDocument();
  });

  it("asks for the rider and bike weight when the site starts", () => {
    render(<App />);

    expect(screen.getByLabelText("Rider weight (kg)")).toBeInTheDocument();
    expect(screen.getByLabelText("Bike weight (kg)")).toBeInTheDocument();
  });

  it("asks again on every start, prefilled with the last used weights", () => {
    saveWeights({ riderKg: 70, bikeKg: 12 });
    render(<App />);

    expect(screen.getByLabelText("Rider weight (kg)")).toHaveValue("70");
    expect(screen.getByLabelText("Bike weight (kg)")).toHaveValue("12");
  });

  it("remembers the weights and moves on once they are confirmed", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Rider weight (kg)"), "70");
    await user.type(screen.getByLabelText("Bike weight (kg)"), "12");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(loadWeights()).toEqual({ riderKg: 70, bikeKg: 12 });
    expect(screen.queryByLabelText("Rider weight (kg)")).not.toBeInTheDocument();
    expect(screen.getByText("Rider 70 kg + bike 12 kg")).toBeInTheDocument();
  });

  it("shows the average power of a ride chosen after the weights are confirmed", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Rider weight (kg)"), "75");
    await user.type(screen.getByLabelText("Bike weight (kg)"), "5");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const t0 = new Date("2024-02-25T13:31:00Z");
    const bytes = buildFit(
      Array.from({ length: 21 }, (_, i) => ({
        timestamp: new Date(t0.getTime() + i * 1000),
        distance: 5 * i,
        altitude: 0,
        speed: 5,
        cadence: 80,
        temperature: 15,
      })),
    );
    await user.upload(
      screen.getByLabelText("Ride file (.fit)"),
      new File([bytes.slice().buffer], "ride.fit"),
    );

    expect(await screen.findByText("Average power while pedalling: 56 W")).toBeInTheDocument();
    expect(screen.getByText("ride.fit")).toBeInTheDocument();
  });

  it("draws a chart for each variable of the chosen ride below the map", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Rider weight (kg)"), "75");
    await user.type(screen.getByLabelText("Bike weight (kg)"), "5");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const t0 = new Date("2024-02-25T13:31:00Z");
    const bytes = buildFit(
      Array.from({ length: 21 }, (_, i) => ({
        timestamp: new Date(t0.getTime() + i * 1000),
        distance: 5 * i,
        altitude: 2450,
        speed: 5,
        cadence: 80,
        heartRate: 140,
        temperature: 15,
      })),
    );
    await user.upload(
      screen.getByLabelText("Ride file (.fit)"),
      new File([bytes.slice().buffer], "ride.fit"),
    );

    const charts = await screen.findByRole("region", { name: "Ride charts" });
    expect(charts).toBeInTheDocument();
    expect(screen.getAllByLabelText(/ by distance/)).toHaveLength(7);
  });

  describe("sections", () => {
    async function confirmWeights(user: ReturnType<typeof userEvent.setup>) {
      await user.clear(screen.getByLabelText("Rider weight (kg)"));
      await user.type(screen.getByLabelText("Rider weight (kg)"), "70");
      await user.clear(screen.getByLabelText("Bike weight (kg)"));
      await user.type(screen.getByLabelText("Bike weight (kg)"), "12");
      await user.click(screen.getByRole("button", { name: "Continue" }));
    }

    it("offers the sections once the weights are confirmed", async () => {
      const user = userEvent.setup();
      render(<App initial={{}} />);
      await confirmWeights(user);

      expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
        "Overview",
        "Metrics",
        "Model",
        "Library",
        "Tools",
        "Device",
        "Settings",
      ]);
      expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    it("names the sections in Spanish when the language is Spanish", async () => {
      const user = userEvent.setup();
      render(<App initial={{ locale: "es" }} />);
      await user.clear(screen.getByLabelText("Peso del ciclista (kg)"));
      await user.type(screen.getByLabelText("Peso del ciclista (kg)"), "70");
      await user.clear(screen.getByLabelText("Peso de la bici (kg)"));
      await user.type(screen.getByLabelText("Peso de la bici (kg)"), "12");
      await user.click(screen.getByRole("button", { name: "Continuar" }));

      expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
        "Resumen",
        "Métricas",
        "Modelo",
        "Biblioteca",
        "Herramientas",
        "Dispositivo",
        "Ajustes",
      ]);
      expect(screen.getByText("Ciclista 70 kg + bici 12 kg")).toBeInTheDocument();
    });

    it("lets you change the weights without reloading, keeping the last ones filled in", async () => {
      const user = userEvent.setup();
      render(<App initial={{}} />);
      await confirmWeights(user);

      await user.click(screen.getByRole("button", { name: "Change weights" }));

      expect(screen.getByLabelText("Rider weight (kg)")).toHaveValue("70");
      expect(screen.getByLabelText("Bike weight (kg)")).toHaveValue("12");
      expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    });

    it("keeps the loaded ride when the weights change, and re-estimates it", async () => {
      const user = userEvent.setup();
      render(<App initial={{}} />);
      await confirmWeights(user);
      const t0 = new Date("2024-02-25T13:31:00Z");
      const bytes = buildFit(
        Array.from({ length: 21 }, (_, i) => ({
          timestamp: new Date(t0.getTime() + i * 1000),
          distance: 5 * i,
          altitude: 0,
          speed: 5,
          cadence: 80,
          temperature: 15,
        })),
      );
      await user.upload(
        screen.getByLabelText("Ride file (.fit)"),
        new File([bytes.slice().buffer], "ride.fit"),
      );
      await screen.findByText(/Average power while pedalling: \d+ W/);

      await user.click(screen.getByRole("button", { name: "Change weights" }));
      await user.clear(screen.getByLabelText("Rider weight (kg)"));
      await user.type(screen.getByLabelText("Rider weight (kg)"), "100");
      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(await screen.findByText("ride.fit")).toBeInTheDocument();
      // 112 kg in total instead of 82 kg: more rolling resistance, so 65 W instead of 56 W.
      expect(screen.getByText("Average power while pedalling: 65 W")).toBeInTheDocument();
    });
  });

  describe("the whole app", () => {
    async function confirm(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByLabelText("Rider weight (kg)"), "70");
      await user.type(screen.getByLabelText("Bike weight (kg)"), "12");
      await user.click(screen.getByRole("button", { name: "Continue" }));
    }

    it("goes to a section with its number key", async () => {
      const user = userEvent.setup();
      render(<App initial={{}} />);
      await confirm(user);

      await user.keyboard("4");

      expect(screen.getByRole("tab", { name: "Library" })).toHaveAttribute("aria-selected", "true");
    });

    it("switches the units with the u key", async () => {
      const user = userEvent.setup();
      render(<App initial={{}} />);
      await confirm(user);

      await user.keyboard("u");

      expect(screen.getByText("Rider 154.3 lb + bike 26.5 lb")).toBeInTheDocument();
    });

    it("introduces itself the first time and not again", async () => {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      const user = userEvent.setup();
      const first = render(<App initial={{}} />);

      expect(await screen.findByText("How your power is estimated")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Got it" }));
      expect(screen.queryByText("How your power is estimated")).not.toBeInTheDocument();

      first.unmount();
      render(<App initial={{}} />);
      expect(screen.queryByText("How your power is estimated")).not.toBeInTheDocument();
    });

    it("loads a sample ride for someone with no file at hand", async () => {
      const user = userEvent.setup();
      render(<App initial={{}} />);
      await confirm(user);

      await user.click(screen.getByRole("button", { name: "Load a sample ride" }));

      expect(await screen.findByText(/Average power while pedalling: \d+ W/)).toBeInTheDocument();
    });

    it("brings back the rides saved by an earlier visit", async () => {
      await getDefaultRideStore().saveRide({
        id: "saved-1",
        fileName: "saved.fit",
        source: "fit",
        bytes: buildFit(steadyRecords(30)),
        savedAt: 1,
      });
      const user = userEvent.setup();
      render(<App initial={{}} />);
      await confirm(user);

      expect(await screen.findByText("saved.fit")).toBeInTheDocument();
    });

    it("offers a printable report and a shareable card for the ride in view", async () => {
      const user = userEvent.setup();
      render(<App initial={{}} />);
      await confirm(user);
      await user.click(screen.getByRole("button", { name: "Load a sample ride" }));

      expect(await screen.findByRole("button", { name: "Print report" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Download summary card" })).toBeInTheDocument();
    });

    it("keeps the 3D view closed until it is asked for", async () => {
      const user = userEvent.setup();
      render(<App initial={{}} />);
      await confirm(user);
      await user.click(screen.getByRole("button", { name: "Load a sample ride" }));

      const toggle = await screen.findByRole("button", { name: "Show 3D view" });

      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("3D route")).not.toBeInTheDocument();
    });

    it("shows the heat map of every loaded ride in the Library", async () => {
      const user = userEvent.setup();
      render(<App initial={{}} />);
      await confirm(user);
      await user.click(screen.getByRole("button", { name: "Load a sample ride" }));
      await screen.findByText(/Average power while pedalling: \d+ W/);

      await user.click(screen.getByRole("tab", { name: "Library" }));

      expect(
        await screen.findByRole("region", { name: "Heat map of all rides" }),
      ).toBeInTheDocument();
    });

    it("has the language, units and offline settings in the Settings section", async () => {
      const user = userEvent.setup();
      render(<App initial={{}} />);
      await confirm(user);

      await user.click(screen.getByRole("tab", { name: "Settings" }));

      expect(await screen.findByText("Language")).toBeInTheDocument();
      expect(screen.getByText("Offline use")).toBeInTheDocument();
    });
  });
});
