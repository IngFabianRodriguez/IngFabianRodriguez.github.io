import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useAppState } from "@/app/AppContext";
import { LoadSampleButton } from "@/features/help/LoadSampleButton";
import { SAMPLE_FILE_NAME } from "@/lib/sampleRide";
import { renderWithApp } from "@/test/renderWithApp";

function Rides() {
  const { rides, activeId } = useAppState();
  return (
    <ul aria-label="Loaded rides">
      {rides.map((r) => (
        <li key={r.id}>{`${r.fileName}|${r.source}|${r.id === activeId ? "active" : "idle"}`}</li>
      ))}
    </ul>
  );
}

describe("LoadSampleButton", () => {
  it("adds the sample ride and makes it the active one", async () => {
    const user = userEvent.setup();
    renderWithApp(
      <>
        <LoadSampleButton />
        <Rides />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Load a sample ride" }));

    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      `${SAMPLE_FILE_NAME}|sample|active`,
    ]);
  });

  it("confirms that the sample was loaded", async () => {
    const user = userEvent.setup();
    renderWithApp(<LoadSampleButton />);

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await user.click(screen.getByRole("button", { name: "Load a sample ride" }));

    expect(screen.getByRole("status")).toHaveTextContent("Sample ride loaded.");
  });

  it("tells the caller the id of the new ride", async () => {
    const onLoaded = vi.fn();
    const user = userEvent.setup();
    renderWithApp(<LoadSampleButton onLoaded={onLoaded} />);

    await user.click(screen.getByRole("button", { name: "Load a sample ride" }));

    expect(onLoaded).toHaveBeenCalledTimes(1);
    expect(onLoaded).toHaveBeenCalledWith(expect.any(String));
  });

  it("is in Spanish when the app is in Spanish", () => {
    renderWithApp(<LoadSampleButton />, { locale: "es" });

    expect(
      screen.getByRole("button", { name: "Cargar un recorrido de ejemplo" }),
    ).toBeInTheDocument();
  });
});
