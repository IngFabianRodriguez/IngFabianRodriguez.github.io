import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompareMap } from "@/features/library/CompareMap";
import { renderWithApp } from "@/test/renderWithApp";
import { rideOf, type Point } from "@/test/rideOf";

// jsdom has no SVG or canvas for Leaflet, so Leaflet is replaced by a recorder of what the
// component asks for and in which order; the real drawing is checked in a browser.
const drawn = vi.hoisted(() => ({
  removed: 0,
  maps: 0,
  order: [] as string[],
  tiles: [] as string[],
  lines: [] as { points: unknown[]; dashArray: string | undefined; color: string | undefined }[],
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
    polyline: (points: unknown[], options: { dashArray?: string; color?: string }) => {
      drawn.lines.push({ points, dashArray: options.dashArray, color: options.color });
      return layer("route");
    },
    latLngBounds: () => ({}),
  };
});

function ride(lat0: number, withPosition = true) {
  const points: Point[] = Array.from({ length: 11 }, (_, i) => {
    const p: Point = { t: i, distance: i * 10, altitude: 0, speed: 5 };
    if (withPosition) {
      p.lat = lat0 + i * 0.0001;
      p.lon = -30.1;
    }
    return p;
  });
  return rideOf(points);
}

beforeEach(() => {
  drawn.removed = 0;
  drawn.maps = 0;
  drawn.order.length = 0;
  drawn.tiles.length = 0;
  drawn.lines.length = 0;
});

const sides = {
  a: { name: "first.fit", ride: ride(4.7) },
  b: { name: "second.fit", ride: ride(4.8) },
};

describe("CompareMap", () => {
  it("draws both routes, the second one dashed so color is not the only difference", () => {
    renderWithApp(<CompareMap {...sides} />);

    expect(drawn.lines).toHaveLength(2);
    expect(drawn.lines[0]?.dashArray).toBeUndefined();
    expect(drawn.lines[1]?.dashArray).toBeDefined();
    expect(drawn.lines[0]?.color).not.toBe(drawn.lines[1]?.color);
  });

  it("sets the map view before adding any layer", () => {
    renderWithApp(<CompareMap {...sides} />);

    const view = drawn.order.indexOf("fitBounds");
    expect(view).toBeGreaterThanOrEqual(0);
    expect(drawn.order.indexOf("add route")).toBeGreaterThan(view);
    expect(drawn.order.indexOf("add tiles")).toBeGreaterThan(view);
  });

  it("takes its tiles from the map privacy choice", () => {
    renderWithApp(<CompareMap {...sides} />);
    expect(drawn.tiles[0]).toContain("tile.openstreetmap.org");
  });

  it("uses the tile server the user chose", () => {
    renderWithApp(<CompareMap {...sides} />, {
      mapPrivacy: {
        mode: "custom",
        customUrl: "https://tiles.example.org/{z}/{x}/{y}.png",
        hideEndsM: 0,
      },
    });
    expect(drawn.tiles).toEqual(["https://tiles.example.org/{z}/{x}/{y}.png"]);
  });

  it("draws no background at all when the user chose none", () => {
    renderWithApp(<CompareMap {...sides} />, {
      mapPrivacy: { mode: "none", customUrl: "", hideEndsM: 0 },
    });
    expect(drawn.tiles).toEqual([]);
    expect(drawn.lines).toHaveLength(2);
  });

  it("leaves out the ends of both routes that the user chose to hide", () => {
    renderWithApp(<CompareMap {...sides} />, {
      mapPrivacy: { mode: "none", customUrl: "", hideEndsM: 25 },
    });
    expect(drawn.lines.map((l) => l.points.length)).toEqual([5, 5]);
  });

  it("names the map and explains the line styles", () => {
    renderWithApp(<CompareMap {...sides} />);

    expect(screen.getByRole("region", { name: "Comparison map" })).toBeInTheDocument();
    expect(screen.getByText("first.fit: solid line. second.fit: dashed line.")).toBeInTheDocument();
  });

  it("says when one ride has no positions and draws the other", () => {
    renderWithApp(<CompareMap a={sides.a} b={{ name: "indoor.fit", ride: ride(4.8, false) }} />);

    expect(drawn.lines).toHaveLength(1);
    expect(
      screen.getByText("indoor.fit has no GPS positions, so only the other route is drawn."),
    ).toBeInTheDocument();
  });

  it("creates no map when neither ride has positions", () => {
    renderWithApp(
      <CompareMap
        a={{ name: "a.fit", ride: ride(4.7, false) }}
        b={{ name: "b.fit", ride: ride(4.7, false) }}
      />,
    );

    expect(screen.getByText("Neither ride has GPS positions to draw.")).toBeInTheDocument();
    expect(drawn.maps).toBe(0);
  });

  it("releases the map when it goes away", () => {
    const { unmount } = renderWithApp(<CompareMap {...sides} />);
    unmount();
    expect(drawn.removed).toBe(1);
  });
});
