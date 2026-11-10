import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { PrintReportButton } from "@/features/share/PrintReportButton";
import { ReportView } from "@/features/share/ReportView";
import { ShareCardButton } from "@/features/share/ShareCardButton";
import { renderWithApp } from "@/test/renderWithApp";
import { rideOf, type Point } from "@/test/rideOf";

const downloads = vi.hoisted(() => [] as { name: string; bytes: Uint8Array }[]);
vi.mock("@/lib/download", () => ({
  downloadFile: (bytes: Uint8Array, name: string) => downloads.push({ name, bytes }),
}));

afterEach(() => {
  downloads.length = 0;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** A 1 km ride in 100 s heading north, with every sensor and GPS. */
const ride = rideOf(
  Array.from({ length: 101 }, (_, i): Point => ({
    t: i,
    distance: 10 * i,
    altitude: 2450 + i * 0.2,
    speed: 10,
    cadence: 80,
    heartRate: 150,
    temperature: 15,
    lat: 4.7 + i * 1e-4,
    lon: -30.1 + i * 1e-5,
  })),
);
const analysis = { ride, watts: Array<number>(101).fill(180) };

describe("ReportView", () => {
  it("has the title, the date and the key numbers of the ride", () => {
    renderWithApp(<ReportView analysis={analysis} fileName="Morning ride.fit" />);

    expect(screen.getByRole("heading", { level: 1, name: "Morning ride" })).toBeInTheDocument();
    expect(screen.getByText(/Sunday, February 25, 2024/)).toBeInTheDocument();
    const numbers = screen.getByRole("region", { name: "Key numbers" });
    const value = (label: string) =>
      within(numbers).getByText(label).nextElementSibling?.textContent;
    expect(value("Distance")).toBe("1 km");
    expect(value("Elapsed time")).toBe("1:40");
    expect(value("Average speed")).toBe("36 km/h");
    expect(value("Average power (pedalling)")).toBe("180 W");
    expect(value("Average heart rate")).toBe("150 bpm");
    expect(value("Average cadence")).toBe("80 rpm");
    expect(value("Altitude range")).toBe("2450 m - 2470 m");
  });

  it("draws the route and a small chart for each main variable, each with a text alternative", () => {
    renderWithApp(<ReportView analysis={analysis} fileName="r.fit" />);

    expect(screen.getByRole("img", { name: "Outline of the route" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Speed in km/h by distance, lowest 36, highest 36" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /^Altitude in m by distance, lowest 2450/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^Heart rate in bpm/ })).toBeInTheDocument();
  });

  it("is laid out for paper: print variants and blocks that stay on one page", () => {
    const { container } = renderWithApp(<ReportView analysis={analysis} fileName="r.fit" />);

    expect(container.querySelector("article")?.className).toContain("print:text-black");
    expect(
      container.querySelectorAll("section.print\\:break-inside-avoid").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("does not draw the hidden ends of the route", () => {
    const full = renderWithApp(<ReportView analysis={analysis} fileName="r.fit" />);
    const fullPoints = full.container
      .querySelector("svg[aria-label='Outline of the route'] polyline")
      ?.getAttribute("points");
    full.unmount();

    const hidden = renderWithApp(<ReportView analysis={analysis} fileName="r.fit" />, {
      mapPrivacy: { mode: "osm", customUrl: "", hideEndsM: 300 },
    });
    const hiddenPoints = hidden.container
      .querySelector("svg[aria-label='Outline of the route'] polyline")
      ?.getAttribute("points");

    expect(hiddenPoints?.split(" ").length ?? 0).toBeLessThan(fullPoints?.split(" ").length ?? 0);
  });

  it("says so when the ride has no GPS positions", () => {
    const noGps = rideOf(
      ride.samples.map((s) => ({ t: s.t, distance: s.distance, altitude: s.altitude, speed: 10 })),
    );

    renderWithApp(
      <ReportView analysis={{ ride: noGps, watts: analysis.watts }} fileName="r.fit" />,
    );

    expect(screen.queryByRole("img", { name: "Outline of the route" })).not.toBeInTheDocument();
    expect(screen.getByText("This ride has no GPS positions to draw.")).toBeInTheDocument();
  });

  it("speaks Spanish and uses miles in imperial units", () => {
    renderWithApp(<ReportView analysis={analysis} fileName="r.fit" />, {
      locale: "es",
      units: "imperial",
    });

    expect(screen.getByText("Cifras clave")).toBeInTheDocument();
    expect(screen.getByText("0.6 mi")).toBeInTheDocument();
  });

  it("has no automatically detectable violations", async () => {
    const { container } = renderWithApp(<ReportView analysis={analysis} fileName="r.fit" />);

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("PrintReportButton", () => {
  it("opens the print dialog with the report in the page, and removes the report afterwards", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const user = userEvent.setup();
    renderWithApp(<PrintReportButton analysis={analysis} fileName="Morning ride.fit" />);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Print report" }));

    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    const root = document.getElementById("print-report-root");
    expect(root?.className).toContain("print:block");
    expect(
      within(root as HTMLElement).getByRole("heading", { level: 1, name: "Morning ride" }),
    ).toBeInTheDocument();
    expect(root?.querySelector("style")?.textContent).toContain("@media print");

    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });
    expect(document.getElementById("print-report-root")).toBeNull();
  });

  it("says how to get a PDF", () => {
    renderWithApp(<PrintReportButton analysis={analysis} fileName="r.fit" />);

    expect(screen.getByText(/Save as PDF/)).toBeInTheDocument();
  });
});

describe("ShareCardButton", () => {
  function stubCanvas() {
    const texts: string[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      new Proxy({} as Record<string, unknown>, {
        get:
          (_t, name) =>
          (...args: unknown[]) => {
            if (name === "fillText") texts.push(String(args[0]));
          },
        set: () => true,
      }) as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
      callback({ arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer } as Blob),
    );
    return texts;
  }

  /** Stands in for the images of the map tiles: records what is asked and loads or fails at once. */
  function stubTiles(outcome: "load" | "fail") {
    const requested: string[] = [];
    class FakeImage {
      crossOrigin = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(url: string) {
        requested.push(url);
        queueMicrotask(() => (outcome === "load" ? this.onload : this.onerror)?.());
      }
    }
    vi.stubGlobal("Image", FakeImage);
    return requested;
  }

  it("draws the summary card and downloads it as a PNG", async () => {
    const texts = stubCanvas();
    stubTiles("load");
    const user = userEvent.setup();
    renderWithApp(<ShareCardButton analysis={analysis} fileName="Morning ride.fit" />);

    await user.click(screen.getByRole("button", { name: "Download summary card" }));

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0]?.name).toBe("Morning-ride-card.png");
    expect([...(downloads[0]?.bytes ?? [])]).toEqual([137, 80, 78, 71]);
    expect(texts).toEqual(
      expect.arrayContaining(["Morning ride", "February 25, 2024", "1 km", "1:40", "180 W"]),
    );
  });

  it("puts the map behind the route, with tiles from the server of the privacy settings", async () => {
    const texts = stubCanvas();
    const requested = stubTiles("load");
    const user = userEvent.setup();
    renderWithApp(<ShareCardButton analysis={analysis} fileName="r.fit" />);

    await user.click(screen.getByRole("button", { name: "Download summary card" }));

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(requested.length).toBeGreaterThan(0);
    expect(
      requested.every((url) =>
        /^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/.test(url),
      ),
    ).toBe(true);
    expect(texts).toContain("© OpenStreetMap contributors");
  });

  it("asks for no tile when the map has no background, and still downloads the card", async () => {
    stubCanvas();
    const requested = stubTiles("load");
    const user = userEvent.setup();
    renderWithApp(<ShareCardButton analysis={analysis} fileName="r.fit" />, {
      mapPrivacy: { mode: "none", customUrl: "", hideEndsM: 0 },
    });

    await user.click(screen.getByRole("button", { name: "Download summary card" }));

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(requested).toEqual([]);
  });

  it("still downloads the card, with the route alone, when the tiles cannot be loaded", async () => {
    const texts = stubCanvas();
    stubTiles("fail");
    const user = userEvent.setup();
    renderWithApp(<ShareCardButton analysis={analysis} fileName="r.fit" />);

    await user.click(screen.getByRole("button", { name: "Download summary card" }));

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(texts).not.toContain("© OpenStreetMap contributors");
  });

  it("tells the user when the image cannot be made", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const user = userEvent.setup();
    renderWithApp(<ShareCardButton analysis={analysis} fileName="r.fit" />);

    await user.click(screen.getByRole("button", { name: "Download summary card" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The image could not be created.");
    expect(downloads).toHaveLength(0);
  });

  it("speaks Spanish when the app does", () => {
    renderWithApp(<ShareCardButton analysis={analysis} fileName="r.fit" />, { locale: "es" });

    expect(screen.getByRole("button", { name: "Descargar tarjeta resumen" })).toBeInTheDocument();
  });
});
