import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { useAppActions, useAppState } from "@/app/AppContext";
import { Button } from "@/components/ui/button";
import { bucketColor } from "@/domain/route";
import { RouteMap } from "@/features/map/RouteMap";
import { renderWithApp } from "@/test/renderWithApp";
import { rideOf, type Point } from "@/test/rideOf";

// jsdom has no SVG or canvas, which Leaflet needs to draw vector layers, so Leaflet is replaced
// by a recorder of what the component asks for, and in which order. The real drawing is checked
// in a browser.
interface FakeMarker {
  latlng: [number, number];
  options: { fillColor?: string; radius?: number };
  tooltip: string | undefined;
  permanent: boolean;
  onMap: boolean;
}
const drawn = vi.hoisted(() => ({
  maps: 0,
  removed: 0,
  fitted: 0,
  order: [] as string[],
  tiles: [] as { url: string; attribution: string | undefined }[],
  polylines: [] as { points: unknown; color: string | undefined }[],
  markers: [] as FakeMarker[],
}));

vi.mock("leaflet", () => {
  interface FakeLayer {
    addTo: () => FakeLayer;
    remove: () => FakeLayer;
    bindTooltip: (content: string, options?: { permanent?: boolean }) => FakeLayer;
    setLatLng: (latlng: [number, number]) => FakeLayer;
    getBounds: () => object;
  }
  const layer = (kind: string, marker?: FakeMarker): FakeLayer => {
    const fake: FakeLayer = {
      addTo: () => {
        drawn.order.push(`add ${kind}`);
        if (marker) marker.onMap = true;
        return fake;
      },
      remove: () => {
        if (marker) marker.onMap = false;
        return fake;
      },
      bindTooltip: (content, options) => {
        if (marker) {
          marker.tooltip = content;
          marker.permanent = options?.permanent ?? false;
        }
        return fake;
      },
      setLatLng: (latlng) => {
        if (marker) marker.latlng = latlng;
        return fake;
      },
      getBounds: () => ({}),
    };
    layers.set(fake, marker);
    return fake;
  };
  const layers = new Map<object, FakeMarker | undefined>();
  return {
    map: () => {
      drawn.maps += 1;
      return {
        fitBounds: () => {
          drawn.fitted += 1;
          drawn.order.push("fitBounds");
        },
        hasLayer: (l: object) => layers.get(l)?.onMap ?? false,
        remove: () => {
          drawn.removed += 1;
        },
      };
    },
    tileLayer: (url: string, options: { attribution?: string }) => {
      drawn.tiles.push({ url, attribution: options.attribution });
      return layer("tiles");
    },
    polyline: (points: unknown, options: { color?: string }) => {
      drawn.polylines.push({ points, color: options.color });
      return layer("route");
    },
    latLngBounds: () => ({}),
    divIcon: (options: { html?: string }) => options,
    marker: (latlng: [number, number], options: { icon: { html?: string } }) => {
      const marker: FakeMarker = {
        latlng,
        options: {},
        tooltip: options.icon.html?.replace(/<[^>]*>/g, ""),
        permanent: true,
        onMap: false,
      };
      drawn.markers.push(marker);
      return layer("marker", marker);
    },
    circleMarker: (latlng: [number, number], options: FakeMarker["options"]) => {
      const marker: FakeMarker = {
        latlng,
        options,
        tooltip: undefined,
        permanent: false,
        onMap: false,
      };
      drawn.markers.push(marker);
      return layer("marker", marker);
    },
  };
});

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

function points(withPosition: boolean): Point[] {
  return Array.from({ length: 10 }, (_, i) => {
    const p: Point = { t: i, distance: i * 5, altitude: 0, speed: 5 };
    if (withPosition) {
      p.lat = 4.7 + i * 0.0001;
      p.lon = -30.1 + i * 0.0001;
    }
    return p;
  });
}

/** A 3 km route heading north, a sample every 100 m and 10 s, every sensor present. */
function longRide(over: (i: number) => Partial<Point> = () => ({})) {
  return rideOf(
    Array.from({ length: 31 }, (_, i) => ({
      t: i * 10,
      distance: i * 100,
      altitude: 2450 + i,
      speed: 10 + (i % 5),
      cadence: 80,
      heartRate: 140,
      temperature: 15,
      lat: 4.7 + i * 0.0009,
      lon: -30.1,
      ...over(i),
    })),
  );
}

beforeEach(() => {
  drawn.maps = 0;
  drawn.removed = 0;
  drawn.fitted = 0;
  drawn.order.length = 0;
  drawn.tiles.length = 0;
  drawn.polylines.length = 0;
  drawn.markers.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

const tooltips = () => drawn.markers.map((m) => m.tooltip);

describe("RouteMap", () => {
  const watts = [0, 100, 100, 100, 100, 200, 200, 200, 200, 200];

  it("draws one polyline per stretch of the route, colored by its power", () => {
    renderWithApp(<RouteMap ride={rideOf(points(true))} watts={watts} />);

    expect(drawn.polylines.map((p) => p.color)).toEqual([bucketColor(6), bucketColor(11)]);
    expect(drawn.fitted).toBe(1);
  });

  it("sets the map view before adding any layer of the route (Leaflet needs a view first)", () => {
    renderWithApp(<RouteMap ride={rideOf(points(true))} watts={watts} />);

    const view = drawn.order.indexOf("fitBounds");
    expect(view).toBeGreaterThanOrEqual(0);
    expect(drawn.order.indexOf("add route")).toBeGreaterThan(view);
    expect(drawn.order.indexOf("add marker")).toBeGreaterThan(view);
  });

  it("uses OpenStreetMap tiles with their attribution", () => {
    renderWithApp(<RouteMap ride={rideOf(points(true))} watts={watts} />);

    expect(drawn.tiles).toHaveLength(1);
    expect(drawn.tiles[0]?.url).toContain("tile.openstreetmap.org");
    expect(drawn.tiles[0]?.attribution).toContain("OpenStreetMap");
  });

  it("shows the map region and what the colors mean", () => {
    renderWithApp(<RouteMap ride={rideOf(points(true))} watts={watts} />);

    expect(screen.getByRole("region", { name: "Route map" })).toBeInTheDocument();
    expect(screen.getByText("Power scale: 0 W to 200 W")).toBeInTheDocument();
  });

  it("releases the map when it goes away", () => {
    const { unmount } = renderWithApp(<RouteMap ride={rideOf(points(true))} watts={watts} />);

    unmount();

    expect(drawn.removed).toBe(1);
  });

  it("says so, and creates no map, when the ride has no GPS positions", () => {
    renderWithApp(<RouteMap ride={rideOf(points(false))} watts={watts} />);

    expect(screen.getByRole("alert")).toHaveTextContent("This ride has no GPS positions to draw.");
    expect(screen.queryByRole("region", { name: "Route map" })).not.toBeInTheDocument();
    expect(drawn.maps).toBe(0);
  });
});

describe("RouteMap tiles and privacy", () => {
  const watts = Array<number>(31).fill(150);

  it("draws no background when the map privacy says none", () => {
    renderWithApp(<RouteMap ride={longRide()} watts={watts} />, {
      mapPrivacy: { mode: "none", customUrl: "", hideEndsM: 0 },
    });

    expect(drawn.tiles).toHaveLength(0);
    expect(drawn.polylines.length).toBeGreaterThan(0);
  });

  it("takes the tiles from the user's own server when the privacy mode is custom", () => {
    renderWithApp(<RouteMap ride={longRide()} watts={watts} />, {
      mapPrivacy: { mode: "custom", customUrl: "https://tiles.test/{z}/{x}/{y}.png", hideEndsM: 0 },
    });

    expect(drawn.tiles.map((t) => t.url)).toEqual(["https://tiles.test/{z}/{x}/{y}.png"]);
  });

  it("does not draw the meters hidden at both ends, nor mark them as start and finish", () => {
    renderWithApp(<RouteMap ride={longRide()} watts={watts} />, {
      mapPrivacy: { mode: "osm", customUrl: "", hideEndsM: 500 },
    });

    const all = drawn.polylines.flatMap((p) => p.points as [number, number][]);
    const lats = all.map((p) => p[0]);
    // 3 km route: the first and last 500 m (0.0045 degrees) are left out
    expect(Math.min(...lats)).toBeGreaterThanOrEqual(4.7 + 5 * 0.0009 - 1e-9);
    expect(Math.max(...lats)).toBeLessThanOrEqual(4.7 + 25 * 0.0009 + 1e-9);
    const start = drawn.markers.find((m) => m.tooltip === "Start");
    expect(start?.latlng[0]).toBeCloseTo(4.7 + 5 * 0.0009, 9);
  });

  it("says the route is hidden, and creates no map, when the ends cover all of it", () => {
    renderWithApp(<RouteMap ride={longRide()} watts={watts} />, {
      mapPrivacy: { mode: "osm", customUrl: "", hideEndsM: 2000 },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Route hidden");
    expect(drawn.maps).toBe(0);
  });
});

describe("RouteMap variable", () => {
  const watts = Array<number>(31).fill(150);

  it("colors the route by the variable in the app state and says what the colors mean", () => {
    renderWithApp(<RouteMap ride={longRide()} watts={watts} />, { mapVariable: "speed" });

    expect(drawn.polylines.length).toBeGreaterThan(1);
    expect(screen.getByText("Speed scale: 36 km/h to 50 km/h")).toBeInTheDocument();
  });

  it("writes the scale in the units of the app", () => {
    renderWithApp(<RouteMap ride={longRide()} watts={watts} />, {
      mapVariable: "altitude",
      units: "imperial",
    });

    expect(screen.getByText(/^Altitude scale: \d+ ft to \d+ ft$/)).toBeInTheDocument();
  });

  it("changes the variable with a select that lists what the ride recorded", async () => {
    const user = userEvent.setup();
    function Probe() {
      return <output aria-label="variable">{useAppState().mapVariable}</output>;
    }
    renderWithApp(
      <>
        <RouteMap ride={longRide()} watts={watts} />
        <Probe />
      </>,
    );

    await user.click(screen.getByRole("combobox", { name: "Color the route by" }));
    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual([
      "Speed",
      "Power",
      "Cadence",
      "Heart rate",
      "Grade",
      "Altitude",
      "Temperature",
    ]);
    await user.click(screen.getByRole("option", { name: "Heart rate" }));

    expect(screen.getByLabelText("variable")).toHaveTextContent("heartRate");
  });

  it("only offers the variables the ride has data for", async () => {
    const user = userEvent.setup();
    const bare = longRide(() => ({ heartRate: 0, cadence: 0 }));
    renderWithApp(<RouteMap ride={bare} watts={Array<number>(31).fill(0)} />);

    await user.click(screen.getByRole("combobox", { name: "Color the route by" }));

    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Speed",
      "Grade",
      "Altitude",
      "Temperature",
    ]);
  });

  it("falls back to a variable the ride has when the chosen one is missing", () => {
    const bare = longRide(() => ({ heartRate: 0 }));
    renderWithApp(<RouteMap ride={bare} watts={watts} />, { mapVariable: "heartRate" });

    expect(screen.getByText(/^Power scale:/)).toBeInTheDocument();
  });

  it("does not draw where the heart rate has no signal", () => {
    renderWithApp(
      <RouteMap ride={longRide((i) => ({ heartRate: i === 15 ? 0 : 140 }))} watts={watts} />,
      {
        mapVariable: "heartRate",
      },
    );

    expect(drawn.polylines).toHaveLength(2);
  });
});

describe("RouteMap markers", () => {
  const watts = Array<number>(31).fill(150);

  it("marks every kilometer", () => {
    renderWithApp(<RouteMap ride={longRide()} watts={watts} />);

    expect(tooltips().filter((t) => /^\d+$/.test(t ?? ""))).toEqual(["1", "2"]);
    expect(
      drawn.markers.filter((m) => /^\d+$/.test(m.tooltip ?? "")).every((m) => m.permanent),
    ).toBe(true);
  });

  it("marks miles in imperial units", () => {
    renderWithApp(<RouteMap ride={longRide()} watts={watts} />, { units: "imperial" });

    expect(tooltips().filter((t) => /^\d+$/.test(t ?? ""))).toEqual(["1"]);
  });

  it("marks where the rider stopped for a minute or more", () => {
    let distance = 0;
    const stopped = rideOf(
      Array.from({ length: 200 }, (_, t): Point => {
        const still = t >= 50 && t < 140;
        if (!still && t > 0) distance += 5;
        return {
          t,
          distance,
          altitude: 2450,
          speed: still ? 0 : 5,
          lat: 4.7 + distance * 1e-5,
          lon: -30.1,
        };
      }),
    );

    renderWithApp(<RouteMap ride={stopped} watts={Array<number>(200).fill(100)} />);

    const stop = drawn.markers.find((m) => m.tooltip?.startsWith("Stop of"));
    expect(stop?.tooltip).toBe("Stop of 1:30");
    expect(stop?.latlng[0]).toBeCloseTo(4.7 + 245e-5, 9);
  });

  it("marks start and finish", () => {
    renderWithApp(<RouteMap ride={longRide()} watts={watts} />);

    expect(tooltips()).toEqual(expect.arrayContaining(["Start", "Finish"]));
  });
});

describe("RouteMap cursor", () => {
  const watts = Array<number>(31).fill(150);

  function Controls() {
    const { setCursorKm } = useAppActions();
    return (
      <>
        <Button onClick={() => setCursorKm(1.5)}>cursor 1.5</Button>
        <Button onClick={() => setCursorKm(null)}>cursor off</Button>
        <output aria-label="cursor">{String(useAppState().cursorKm)}</output>
      </>
    );
  }
  const cursor = () => drawn.markers.find((m) => m.options.fillColor === "#2563eb");

  it("moves a marker to where the shared cursor is, and removes it without a cursor", async () => {
    const user = userEvent.setup();
    renderWithApp(
      <>
        <RouteMap ride={longRide()} watts={watts} />
        <Controls />
      </>,
    );
    expect(cursor()?.onMap).toBe(false);

    await user.click(screen.getByRole("button", { name: "cursor 1.5" }));

    expect(cursor()?.onMap).toBe(true);
    expect(cursor()?.latlng[0]).toBeCloseTo(4.7 + 15 * 0.0009, 9);
    expect(drawn.maps).toBe(1);

    await user.click(screen.getByRole("button", { name: "cursor off" }));
    expect(cursor()?.onMap).toBe(false);
  });

  it("starts with the marker where the cursor already is", () => {
    renderWithApp(<RouteMap ride={longRide()} watts={watts} />, { cursorKm: 1 });

    expect(cursor()?.onMap).toBe(true);
    expect(cursor()?.latlng[0]).toBeCloseTo(4.7 + 10 * 0.0009, 9);
  });

  it("does not show the marker inside the hidden ends of the route", () => {
    renderWithApp(<RouteMap ride={longRide()} watts={watts} />, {
      cursorKm: 0.2,
      mapPrivacy: { mode: "osm", customUrl: "", hideEndsM: 500 },
    });

    expect(cursor()?.onMap).toBe(false);
  });
});

describe("RouteMap replay", () => {
  const watts = Array<number>(31).fill(150);

  function Cursor() {
    return <output aria-label="cursor">{String(useAppState().cursorKm)}</output>;
  }
  const cursorKm = () => Number(screen.getByLabelText("cursor").textContent);
  const play = () => fireEvent.click(screen.getByRole("button", { name: "Play replay" }));
  const speed = (label: string) =>
    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Replay speed" })).getByRole("radio", {
        name: label,
      }),
    );
  const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
  const setup = () => {
    vi.useFakeTimers();
    renderWithApp(
      <>
        <RouteMap ride={longRide()} watts={watts} />
        <Cursor />
      </>,
    );
  };

  it("plays the ride back at the chosen speed, moving the shared cursor along the route", () => {
    setup();

    play();
    expect(screen.getByRole("button", { name: "Pause replay" })).toBeInTheDocument();
    expect(cursorKm()).toBe(0);

    advance(1000);
    // 60x: one second of the replay is a minute of the ride, 60 s at 10 m/s is 0.6 km
    expect(cursorKm()).toBeCloseTo(0.6, 1);
  });

  it("pauses where it is and goes on from there", () => {
    setup();

    play();
    advance(500);
    fireEvent.click(screen.getByRole("button", { name: "Pause replay" }));
    const paused = cursorKm();
    advance(1000);
    expect(cursorKm()).toBe(paused);

    play();
    advance(300);
    expect(cursorKm()).toBeGreaterThan(paused);
  });

  it("goes slower or faster when another speed is chosen", () => {
    setup();

    speed("10x");
    play();
    advance(1000);

    expect(cursorKm()).toBeCloseTo(0.1, 1);
  });

  it("stops at the end of the route and offers to play again", () => {
    setup();
    speed("1000x");

    play();
    advance(5000);

    expect(cursorKm()).toBe(3);
    expect(screen.getByRole("button", { name: "Play replay" })).toBeInTheDocument();
  });
});

describe("RouteMap language and accessibility", () => {
  it("speaks Spanish when the app does", () => {
    renderWithApp(<RouteMap ride={longRide()} watts={Array<number>(31).fill(150)} />, {
      locale: "es",
    });

    expect(screen.getByRole("region", { name: "Mapa de la ruta" })).toBeInTheDocument();
    expect(screen.getByText(/^Escala de potencia: de 0 W a 150 W$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reproducir la salida" })).toBeInTheDocument();
    expect(drawn.markers.map((m) => m.tooltip)).toEqual(
      expect.arrayContaining(["Inicio", "Llegada"]),
    );
  });

  it("has no automatically detectable violations", async () => {
    const { container } = renderWithApp(
      <RouteMap ride={longRide()} watts={Array<number>(31).fill(150)} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
