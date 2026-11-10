import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { analyzeLoaded } from "@/domain/analysis";
import { DEFAULT_MODEL_SETTINGS } from "@/domain/modelSettings";
import { AnalysisSummary } from "@/features/analysis/AnalysisSummary";
import { makeLoadedRide, steadyRecords } from "@/test/fixtures";
import { renderWithApp } from "@/test/renderWithApp";

const weights = { riderKg: 75, bikeKg: 5 };

function analysis() {
  // 20 s at 5 m/s, then 20 s at 10 m/s: about 56 W, then about 106 W (sea level, flat).
  const records = steadyRecords(40, (i) =>
    i < 20 ? {} : { speed: 10, distance: 100 + 10 * (i - 20) },
  );
  return analyzeLoaded(makeLoadedRide(records), weights, DEFAULT_MODEL_SETTINGS);
}

describe("AnalysisSummary", () => {
  it("works on its own, in English", () => {
    render(<AnalysisSummary fileName="ride.fit" analysis={analysis()} />);

    expect(screen.getByText("ride.fit")).toBeInTheDocument();
    expect(screen.getByText(/Average power while pedalling: \d+ W/)).toBeInTheDocument();
    expect(screen.getByText(/Peak power: \d+ W/)).toBeInTheDocument();
  });

  it("is computed for the selected stretch and says which stretch it is", () => {
    renderWithApp(<AnalysisSummary fileName="ride.fit" analysis={analysis()} />, {
      range: { fromKm: 0, toKm: 0.09 },
      units: "metric",
    });

    expect(screen.getByText("Average power while pedalling: 56 W")).toBeInTheDocument();
    expect(screen.getByText("Selected stretch: 0 km to 0.1 km")).toBeInTheDocument();
  });

  it("speaks Spanish and uses miles when asked", () => {
    renderWithApp(<AnalysisSummary fileName="ride.fit" analysis={analysis()} />, {
      locale: "es",
      units: "imperial",
      range: { fromKm: 0, toKm: 0.09 },
    });

    expect(screen.getByText("Potencia media al pedalear: 56 W")).toBeInTheDocument();
    expect(screen.getByText("Tramo seleccionado: 0 mi a 0.1 mi")).toBeInTheDocument();
  });
});
