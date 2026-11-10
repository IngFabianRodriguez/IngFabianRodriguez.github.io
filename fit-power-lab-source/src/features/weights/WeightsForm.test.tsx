import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WeightsForm } from "@/features/weights/WeightsForm";
import { renderWithApp } from "@/test/renderWithApp";

describe("WeightsForm", () => {
  it("asks for the rider and the bike weight", () => {
    render(<WeightsForm initial={null} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("Rider weight (kg)")).toHaveValue("");
    expect(screen.getByLabelText("Bike weight (kg)")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("prefills the last used weights", () => {
    render(<WeightsForm initial={{ riderKg: 72.5, bikeKg: 9 }} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("Rider weight (kg)")).toHaveValue("72.5");
    expect(screen.getByLabelText("Bike weight (kg)")).toHaveValue("9");
  });

  it("submits the parsed weights", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<WeightsForm initial={null} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Rider weight (kg)"), "72,5");
    await user.type(screen.getByLabelText("Bike weight (kg)"), "9");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ riderKg: 72.5, bikeKg: 9 });
  });

  it("shows what is wrong and does not submit invalid weights", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<WeightsForm initial={null} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Rider weight (kg)"), "5");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Your weight must be between 20 and 250 kg.")).toBeInTheDocument();
    expect(screen.getByText("Enter the bike weight in kg.")).toBeInTheDocument();
    expect(screen.getByLabelText("Rider weight (kg)")).toBeInvalid();
  });

  it("asks in pounds when the units are imperial and returns kilograms", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithApp(<WeightsForm initial={{ riderKg: 72.5, bikeKg: 9 }} onSubmit={onSubmit} />, {
      units: "imperial",
    });

    expect(screen.getByLabelText("Rider weight (lb)")).toHaveValue("159.8");
    await user.clear(screen.getByLabelText("Rider weight (lb)"));
    await user.type(screen.getByLabelText("Rider weight (lb)"), "160");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0].riderKg).toBeCloseTo(72.575, 3);
  });

  it("shows the range in the typed unit when the weight is out of range", async () => {
    const user = userEvent.setup();
    renderWithApp(<WeightsForm initial={null} onSubmit={vi.fn()} />, { units: "imperial" });

    await user.type(screen.getByLabelText("Rider weight (lb)"), "20");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Your weight must be between 44 and 551 lb.")).toBeInTheDocument();
  });

  it("speaks Spanish when the language is Spanish", async () => {
    const user = userEvent.setup();
    renderWithApp(<WeightsForm initial={null} onSubmit={vi.fn()} />, { locale: "es" });

    expect(screen.getByLabelText("Peso del ciclista (kg)")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Peso del ciclista (kg)"), "5");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("Tu peso debe estar entre 20 y 250 kg.")).toBeInTheDocument();
    expect(screen.getByText("Escribe el peso de la bici en kg.")).toBeInTheDocument();
  });
});
