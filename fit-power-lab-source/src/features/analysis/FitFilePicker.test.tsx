import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import { FitFilePicker } from "@/features/analysis/FitFilePicker";
import { gpxText, straightPoints, tcxText } from "@/domain/import/testData";
import { sourceOf } from "@/lib/persistence/sources";
import { buildFit } from "@/test/buildFit";

const t0 = new Date("2024-02-25T13:31:00Z");
const weights = { riderKg: 75, bikeKg: 5 };

function fitFile(name: string): File {
  const bytes = buildFit(
    Array.from({ length: 11 }, (_, i) => ({
      timestamp: new Date(t0.getTime() + i * 1000),
      distance: 5 * i,
      altitude: 0,
      speed: 5,
      cadence: 80,
      temperature: 15,
    })),
  );
  return new File([bytes.slice().buffer], name, { type: "application/octet-stream" });
}

const textFile = (text: string, name: string) => new File([text], name, { type: "text/xml" });

describe("FitFilePicker", () => {
  it("offers a field to choose a .fit file", () => {
    render(<FitFilePicker weights={weights} onAnalyzed={vi.fn()} />);

    expect(screen.getByLabelText("Ride file (.fit)")).toBeInTheDocument();
  });

  it("analyzes the chosen file with the given weights and reports the result", async () => {
    const onAnalyzed = vi.fn();
    const user = userEvent.setup();
    render(<FitFilePicker weights={weights} onAnalyzed={onAnalyzed} />);

    await user.upload(screen.getByLabelText("Ride file (.fit)"), fitFile("2024-02-25.fit"));

    await waitFor(() => expect(onAnalyzed).toHaveBeenCalledTimes(1));
    const [analysis, fileName] = onAnalyzed.mock.calls[0] ?? [];
    expect(fileName).toBe("2024-02-25.fit");
    expect(analysis.watts).toHaveLength(11);
    expect(analysis.watts[5]).toBe(56);
  });

  it("explains why a file could not be used and reports nothing", async () => {
    const onAnalyzed = vi.fn();
    const user = userEvent.setup();
    render(<FitFilePicker weights={weights} onAnalyzed={onAnalyzed} />);

    const notFit = new File([new Uint8Array(40)], "notes.fit");
    await user.upload(screen.getByLabelText("Ride file (.fit)"), notFit);

    expect(await screen.findByRole("alert")).toHaveTextContent("The file is not a valid FIT file.");
    expect(onAnalyzed).not.toHaveBeenCalled();
  });

  it("analyzes several files at once and reports each good one once, with its source", async () => {
    const onAnalyzed = vi.fn();
    const user = userEvent.setup();
    render(<FitFilePicker weights={weights} onAnalyzed={onAnalyzed} />);

    await user.upload(screen.getByLabelText("Ride file (.fit)"), [
      fitFile("a.fit"),
      textFile(gpxText(straightPoints(9)), "b.gpx"),
      textFile(tcxText(straightPoints(9)), "c.tcx"),
    ]);

    await waitFor(() => expect(onAnalyzed).toHaveBeenCalledTimes(3));
    expect(onAnalyzed.mock.calls.map((call) => [call[1], call[2]])).toEqual([
      ["a.fit", "fit"],
      ["b.gpx", "gpx"],
      ["c.tcx", "tcx"],
    ]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("gives imported rides watts and a FIT, like any other ride", async () => {
    const onAnalyzed = vi.fn();
    const user = userEvent.setup();
    render(<FitFilePicker weights={weights} onAnalyzed={onAnalyzed} />);

    await user.upload(
      screen.getByLabelText("Ride file (.fit)"),
      textFile(gpxText(straightPoints(9)), "b.gpx"),
    );

    await waitFor(() => expect(onAnalyzed).toHaveBeenCalledTimes(1));
    const [analysis] = onAnalyzed.mock.calls[0] ?? [];
    expect(analysis.ride.samples).toHaveLength(9);
    expect(analysis.watts).toHaveLength(9);
    expect(analysis.fit.messages.length).toBeGreaterThan(9);
  });

  it("remembers the bytes of each file so the ride can be saved as it was given", async () => {
    const onAnalyzed = vi.fn();
    const user = userEvent.setup();
    render(<FitFilePicker weights={weights} onAnalyzed={onAnalyzed} />);
    const file = fitFile("a.fit");

    await user.upload(screen.getByLabelText("Ride file (.fit)"), file);

    await waitFor(() => expect(onAnalyzed).toHaveBeenCalledTimes(1));
    const [analysis] = onAnalyzed.mock.calls[0] ?? [];
    expect(sourceOf(analysis.fit)?.bytes.length).toBe(file.size);
  });

  it("names each file that failed and still analyzes the others", async () => {
    const onAnalyzed = vi.fn();
    const user = userEvent.setup();
    render(<FitFilePicker weights={weights} onAnalyzed={onAnalyzed} />);

    await user.upload(screen.getByLabelText("Ride file (.fit)"), [
      new File([new Uint8Array(40)], "notes.fit"),
      fitFile("good.fit"),
      textFile("<gpx></gpx>", "empty.gpx"),
    ]);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("That file could not be used");
    expect(alert).toHaveTextContent("notes.fit: The file is not a valid FIT file.");
    expect(alert).toHaveTextContent("empty.gpx: The file has no track points.");
    expect(onAnalyzed).toHaveBeenCalledTimes(1);
    expect(onAnalyzed.mock.calls[0]?.[1]).toBe("good.fit");
  });

  it("clears the errors of the previous choice when new files are chosen", async () => {
    const user = userEvent.setup();
    render(<FitFilePicker weights={weights} onAnalyzed={vi.fn()} />);
    const input = screen.getByLabelText("Ride file (.fit)");

    await user.upload(input, new File([new Uint8Array(40)], "notes.fit"));
    await screen.findByRole("alert");
    await user.upload(input, fitFile("good.fit"));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("analyzes the files that are dropped on the page", async () => {
    const onAnalyzed = vi.fn();
    render(<FitFilePicker weights={weights} onAnalyzed={onAnalyzed} />);

    fireEvent.drop(document.body, {
      dataTransfer: { files: [fitFile("dropped.fit"), fitFile("two.fit")], types: ["Files"] },
    });

    await waitFor(() => expect(onAnalyzed).toHaveBeenCalledTimes(2));
    expect(onAnalyzed.mock.calls.map((call) => call[1])).toEqual(["dropped.fit", "two.fit"]);
  });

  it("says that a dropped file of another type cannot be used", async () => {
    const onAnalyzed = vi.fn();
    render(<FitFilePicker weights={weights} onAnalyzed={onAnalyzed} />);

    fireEvent.drop(document.body, {
      dataTransfer: { files: [textFile("hello", "notes.txt")], types: ["Files"] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "notes.txt: That file type is not supported. Use .fit, .gpx or .tcx files.",
    );
    expect(onAnalyzed).not.toHaveBeenCalled();
  });

  it("highlights the drop area while files are dragged over the page", () => {
    render(<FitFilePicker weights={weights} onAnalyzed={vi.fn()} />);
    expect(screen.getByText("Drag and drop ride files here")).toBeInTheDocument();

    fireEvent.dragEnter(document.body, { dataTransfer: { types: ["Files"] } });
    expect(screen.getByText("Drop the files to analyze them")).toBeInTheDocument();

    fireEvent.dragLeave(document.body, { dataTransfer: { types: ["Files"] } });
    expect(screen.getByText("Drag and drop ride files here")).toBeInTheDocument();
  });

  it("ignores a drag that carries no files", () => {
    render(<FitFilePicker weights={weights} onAnalyzed={vi.fn()} />);

    fireEvent.dragEnter(document.body, { dataTransfer: { types: ["text/plain"] } });

    expect(screen.getByText("Drag and drop ride files here")).toBeInTheDocument();
  });

  it("shows how far the analysis is while a file is being read, and hides it afterwards", async () => {
    const onAnalyzed = vi.fn();
    const user = userEvent.setup();
    render(<FitFilePicker weights={weights} onAnalyzed={onAnalyzed} />);

    const file = fitFile("big.fit");
    const buffer = await file.arrayBuffer();
    const hold: { release: (() => void) | null } = { release: null };
    Object.defineProperty(file, "arrayBuffer", {
      value: () => new Promise<ArrayBuffer>((resolve) => (hold.release = () => resolve(buffer))),
    });

    await user.upload(screen.getByLabelText("Ride file (.fit)"), file);

    const bar = await screen.findByRole("progressbar", { name: "Analyzing files" });
    expect(bar).toBeInTheDocument();
    expect(screen.getByText("Analyzing big.fit (1 of 1)")).toBeInTheDocument();
    expect(onAnalyzed).not.toHaveBeenCalled();

    await waitFor(() => expect(hold.release).not.toBeNull());
    hold.release?.();
    await waitFor(() => expect(onAnalyzed).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
  });

  it("moves the progress forward file by file", async () => {
    const user = userEvent.setup();
    render(<FitFilePicker weights={weights} onAnalyzed={vi.fn()} />);
    const seen: number[] = [];
    const watch = new MutationObserver(() => {
      const value = screen.queryByRole("progressbar")?.getAttribute("aria-valuenow");
      if (value !== null && value !== undefined) seen.push(Number(value));
    });
    watch.observe(document.body, { attributes: true, subtree: true, childList: true });

    await user.upload(screen.getByLabelText("Ride file (.fit)"), [
      fitFile("a.fit"),
      fitFile("b.fit"),
    ]);
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
    watch.disconnect();

    expect(seen.length).toBeGreaterThan(1);
    expect(Math.max(...seen)).toBeGreaterThan(50);
    expect([...seen]).toEqual([...seen].sort((a, b) => a - b));
  });

  it("has no automatically detectable accessibility violations", async () => {
    const { container } = render(<FitFilePicker weights={weights} onAnalyzed={vi.fn()} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
