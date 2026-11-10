import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { RoutesHeatMap } from "@/features/map/RoutesHeatMap";
import { renderWithApp } from "@/test/renderWithApp";
import { makeLoadedRide, steadyRecords } from "@/test/fixtures";

const drawn = vi.hoisted(() => ({
  maps: 0,
  removed: 0,
  order: [] as string[],
  tiles: [] as string[],
  polylines: [] as { points: [number, number][]; options: { opacity?: number; color?: string } }[],
}));

vi.mock("leaflet", () => {
  const layer = (kind: string) => {
    const fake = {
      addTo: () => {
        drawn.order.push(`add ${kind}`);
        return fake;
      },
    };
    return fake;
  };
  return {
    map: () => {
      drawn.maps += 1;
      return {
        fitBounds: () => drawn.order.push("fitBounds"),
        remove: () => {
          drawn.removed += 1;
        },
      };
    },
    tileLayer: (url: string) => {
      drawn.tiles.push(url);
      return layer("tiles");
    },
    polyline: (points: [number, number][], options: { opacity?: number; color?: string }) => {
      drawn.polylines.push({ points, options });
      return layer("route");
    },
    latLngBounds: () => ({}),
  };
});

beforeEach(() => {
  drawn.maps = 0;
  drawn.removed = 0;
  drawn.order.length = 0;
  drawn.tiles.length = 0;
  drawn.polylines.length = 0;
});

const ride = (name: string, lonShift: number) =>
  makeLoadedRide(
    steadyRecords(60, (i) => ({ lat: 4.7 + i * 1e-4, lon: -30.1 + lonShift })),
    name,
  );

describe("RoutesHeatMap", () => {
  it("draws every loaded ride as a translucent line, so overlaps build up color", () => {
    renderWithApp(<RoutesHeatMap />, { rides: [ride("a.fit", 0), ride("b.fit", 0.001)] });

    expect(drawn.polylines).toHaveLength(2);
    expect(drawn.polylines.every((p) => (p.options.opacity ?? 1) < 0.5)).toBe(true);
    expect(screen.getByRole("region", { name: "Heat map of all rides" })).toBeInTheDocument();
    expect(screen.getByText(/^2 rides drawn/)).toBeInTheDocument();
  });

  it("sets the view before adding any line, and releases the map when it goes away", () => {
    const { unmount } = renderWithApp(<RoutesHeatMap />, { rides: [ride("a.fit", 0)] });

    expect(drawn.order.indexOf("fitBounds")).toBeLessThan(drawn.order.indexOf("add route"));
    unmount();
    expect(drawn.removed).toBe(1);
  });

  it("gets its tiles from the map privacy settings, and none when the mode is none", () => {
    renderWithApp(<RoutesHeatMap />, { rides: [ride("a.fit", 0)] });
    expect(drawn.tiles).toHaveLength(1);
    expect(drawn.tiles[0]).toContain("tile.openstreetmap.org");

    drawn.tiles.length = 0;
    renderWithApp(<RoutesHeatMap />, {
      rides: [ride("a.fit", 0)],
      mapPrivacy: { mode: "none", customUrl: "", hideEndsM: 0 },
    });
    expect(drawn.tiles).toHaveLength(0);
  });

  it("does not draw the meters hidden at the ends of each ride", () => {
    renderWithApp(<RoutesHeatMap />, {
      rides: [ride("a.fit", 0)],
      mapPrivacy: { mode: "osm", customUrl: "", hideEndsM: 100 },
    });

    // 60 samples of 5 m: 295 m, so 100 m are hidden at each end
    const points = drawn.polylines[0]?.points ?? [];
    expect(points.length).toBe(20);
    expect(points[0]?.[0]).toBeGreaterThanOrEqual(4.7 + 20 * 1e-4 - 1e-6);
  });

  it("says so, and creates no map, when there are no rides with GPS positions", () => {
    renderWithApp(<RoutesHeatMap />);

    expect(screen.getByText("Load rides with GPS positions to see them here.")).toBeInTheDocument();
    expect(drawn.maps).toBe(0);
  });

  it("speaks Spanish and has no automatically detectable violations", async () => {
    const { container } = renderWithApp(<RoutesHeatMap />, {
      rides: [ride("a.fit", 0)],
      locale: "es",
    });

    expect(
      screen.getByRole("region", { name: "Mapa de calor de todas las salidas" }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("counts the rides in the singular and in the plural", () => {
    const one = makeLoadedRide(steadyRecords(30), "one.fit", "one");
    const two = makeLoadedRide(steadyRecords(30), "two.fit", "two");

    const first = renderWithApp(<RoutesHeatMap />, { rides: [one] });
    expect(screen.getByText(/^1 ride drawn\./)).toBeInTheDocument();
    first.unmount();

    renderWithApp(<RoutesHeatMap />, { rides: [one, two] });
    expect(screen.getByText(/^2 rides drawn\./)).toBeInTheDocument();
  });
});
