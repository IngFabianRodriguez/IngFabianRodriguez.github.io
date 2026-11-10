import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { FlyoverVideoButton } from "@/features/flyover/FlyoverVideoButton";
import * as make from "@/features/flyover/makeFlyoverVideo";
import { WebGlUnavailableError } from "@/features/flyover/flyoverSession";
import * as supportModule from "@/features/flyover/support";
import { renderWithApp } from "@/test/renderWithApp";
import { rideOf, type Point } from "@/test/rideOf";

const downloads = vi.hoisted(() => [] as { name: string; bytes: Uint8Array }[]);
vi.mock("@/lib/download", () => ({
  downloadFile: (bytes: Uint8Array, name: string) => downloads.push({ name, bytes }),
}));

vi.mock("@/features/flyover/makeFlyoverVideo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/flyover/makeFlyoverVideo")>()),
  makeFlyoverVideo: vi.fn(),
}));
vi.mock("@/features/flyover/support", () => ({ flyoverSupport: vi.fn() }));

const makeVideo = vi.mocked(make.makeFlyoverVideo);
const support = vi.mocked(supportModule.flyoverSupport);
const file = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]);

beforeEach(() => {
  support.mockResolvedValue("ok");
});

afterEach(() => {
  downloads.length = 0;
  makeVideo.mockReset();
  support.mockReset();
});

const ride = rideOf(
  Array.from({ length: 101 }, (_, i): Point => ({
    t: i,
    distance: 10 * i,
    altitude: 2450,
    speed: 10,
    lat: 4.7 + i * 1e-4,
    lon: -30.1 + i * 1e-5,
  })),
);
const analysis = { ride, watts: Array<number>(101).fill(180) };

/** A video that the test finishes, fails or reports on when it decides to. */
function controlled() {
  let report: (stage: "tiles" | "video", progress: number) => void = () => {};
  let finish: (bytes: Uint8Array) => void = () => {};
  let fail: (error: Error) => void = () => {};
  makeVideo.mockImplementation(
    (options) =>
      new Promise<Uint8Array>((resolve, reject) => {
        report = (stage, progress) => options.onProgress?.(stage, progress);
        finish = resolve;
        fail = reject;
        options.signal?.addEventListener("abort", () =>
          reject(new DOMException("cancelled", "AbortError")),
        );
      }),
  );
  return {
    report: (stage: "tiles" | "video", p: number) => act(() => report(stage, p)),
    finish: (b: Uint8Array = file) => finish(b),
    fail: (e: Error) => fail(e),
  };
}

const vertical = () => screen.getByRole("button", { name: "Download 3D video (MP4, vertical)" });

describe("FlyoverVideoButton", () => {
  it("makes the vertical video of the ride with the choices of the app, and downloads the MP4", async () => {
    const video = controlled();
    const user = userEvent.setup();
    renderWithApp(<FlyoverVideoButton analysis={analysis} fileName="Morning ride.fit" />, {
      mapPrivacy: { mode: "osm", customUrl: "", hideEndsM: 300 },
      units: "imperial",
    });
    await waitFor(() => expect(vertical()).toBeEnabled());

    await user.click(vertical());

    await waitFor(() => expect(makeVideo).toHaveBeenCalledTimes(1));
    const options = makeVideo.mock.calls[0]?.[0];
    expect(options).toMatchObject({
      orientation: "vertical",
      units: "imperial",
      hideEndsM: 300,
      title: "Morning ride",
      dateText: "February 25, 2024",
    });
    expect(options?.tiles.url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(options?.terrain.url).toContain("terrarium");
    video.finish();

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0]?.name).toBe("Morning-ride-3d-vertical.mp4");
    expect([...(downloads[0]?.bytes ?? [])]).toEqual([...file]);
  });

  it("makes the horizontal video from the menu of more formats", async () => {
    const video = controlled();
    const user = userEvent.setup();
    renderWithApp(<FlyoverVideoButton analysis={analysis} fileName="Morning ride.fit" />);
    await waitFor(() => expect(vertical()).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "More video formats" }));
    await user.click(await screen.findByRole("menuitem", { name: "Horizontal MP4, for screens" }));

    await waitFor(() => expect(makeVideo).toHaveBeenCalledTimes(1));
    expect(makeVideo.mock.calls[0]?.[0].orientation).toBe("horizontal");
    video.finish();
    await waitFor(() => expect(downloads[0]?.name).toBe("Morning-ride-3d-horizontal.mp4"));
  });

  it("asks for no map and no relief when the privacy settings say so", async () => {
    controlled();
    const user = userEvent.setup();
    renderWithApp(<FlyoverVideoButton analysis={analysis} fileName="r.fit" />, {
      mapPrivacy: { mode: "none", customUrl: "", hideEndsM: 0 },
      terrainPrivacy: { mode: "none", customUrl: "" },
    });
    await waitFor(() => expect(vertical()).toBeEnabled());

    await user.click(vertical());

    await waitFor(() => expect(makeVideo).toHaveBeenCalled());
    const options = makeVideo.mock.calls[0]?.[0];
    expect(options?.tiles.url).toBeNull();
    expect(options?.terrain.url).toBeNull();
  });

  it("shows the stage and how far it has got, and blocks a second video, while it works", async () => {
    const video = controlled();
    const user = userEvent.setup();
    renderWithApp(<FlyoverVideoButton analysis={analysis} fileName="r.fit" />);
    await waitFor(() => expect(vertical()).toBeEnabled());

    await user.click(vertical());
    await video.report("tiles", 0.4);

    expect(screen.getByRole("status")).toHaveTextContent("Loading the map and the terrain… 40%");
    await video.report("video", 0.7);
    expect(screen.getByRole("status")).toHaveTextContent("Making the video… 70%");
    expect(screen.getByRole("progressbar", { name: "Video progress" })).toHaveAttribute(
      "aria-valuenow",
      "70",
    );
    expect(vertical()).toBeDisabled();
    expect(screen.getByRole("button", { name: "More video formats" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel video" })).toBeEnabled();

    video.finish();
    await waitFor(() => expect(vertical()).toBeEnabled());
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("stops without a download or an error when the user cancels", async () => {
    controlled();
    const user = userEvent.setup();
    renderWithApp(<FlyoverVideoButton analysis={analysis} fileName="r.fit" />);
    await waitFor(() => expect(vertical()).toBeEnabled());
    await user.click(vertical());
    await waitFor(() => expect(makeVideo).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Cancel video" }));

    await waitFor(() => expect(vertical()).toBeEnabled());
    expect(makeVideo.mock.calls[0]?.[0].signal?.aborted).toBe(true);
    expect(downloads).toHaveLength(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("tells the user when the video cannot be made, and lets them try again", async () => {
    const video = controlled();
    const user = userEvent.setup();
    renderWithApp(<FlyoverVideoButton analysis={analysis} fileName="r.fit" />);
    await waitFor(() => expect(vertical()).toBeEnabled());
    await user.click(vertical());
    await waitFor(() => expect(makeVideo).toHaveBeenCalled());

    video.fail(new Error("encoder lost"));

    expect(await screen.findByRole("alert")).toHaveTextContent("The video could not be created.");
    expect(downloads).toHaveLength(0);
    expect(vertical()).toBeEnabled();
  });

  it("says when the ride has no route to fly over", async () => {
    const video = controlled();
    const user = userEvent.setup();
    renderWithApp(<FlyoverVideoButton analysis={analysis} fileName="r.fit" />);
    await waitFor(() => expect(vertical()).toBeEnabled());
    await user.click(vertical());
    await waitFor(() => expect(makeVideo).toHaveBeenCalled());

    video.fail(new make.NoRouteError());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This ride has no GPS positions to fly over.",
    );
  });

  it("says the browser cannot draw 3D maps if it turns out it cannot", async () => {
    const video = controlled();
    const user = userEvent.setup();
    renderWithApp(<FlyoverVideoButton analysis={analysis} fileName="r.fit" />);
    await waitFor(() => expect(vertical()).toBeEnabled());
    await user.click(vertical());
    await waitFor(() => expect(makeVideo).toHaveBeenCalled());

    video.fail(new WebGlUnavailableError());

    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot draw 3D maps/);
  });

  it.each([
    ["no-webgl", /cannot draw 3D maps/],
    ["no-encoder", /cannot encode H\.264 video/],
  ] as const)("is switched off, and says why, in a browser with %s", async (kind, message) => {
    support.mockResolvedValue(kind);
    renderWithApp(<FlyoverVideoButton analysis={analysis} fileName="r.fit" />);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(vertical()).toBeDisabled();
    expect(screen.getByRole("button", { name: "More video formats" })).toBeDisabled();
  });

  it("explains what the video is and what it asks of the network", () => {
    renderWithApp(<FlyoverVideoButton analysis={analysis} fileName="r.fit" />);

    expect(
      screen.getByText(/Only the map and terrain tiles are asked of their servers/),
    ).toBeVisible();
  });

  it("speaks Spanish when the app does", async () => {
    renderWithApp(<FlyoverVideoButton analysis={analysis} fileName="r.fit" />, { locale: "es" });

    expect(
      await screen.findByRole("button", { name: "Descargar video 3D (MP4, vertical)" }),
    ).toBeInTheDocument();
  });

  it("has no automatically detectable violations, also while it works", async () => {
    const video = controlled();
    const user = userEvent.setup();
    const { container } = renderWithApp(
      <FlyoverVideoButton analysis={analysis} fileName="r.fit" />,
    );
    await waitFor(() => expect(vertical()).toBeEnabled());
    expect(await axe(container)).toHaveNoViolations();

    await user.click(vertical());
    await video.report("video", 0.3);

    expect(await axe(container)).toHaveNoViolations();
  });
});
