import { afterEach, describe, expect, it, vi } from "vitest";
import { canvasToBytes, serializeSvg, svgToPngBytes } from "@/features/share/imageExport";

const SVG = "http://www.w3.org/2000/svg";

/** A small chart-like svg: a grid, a tick label and a curve colored through a CSS variable. */
function chart(): SVGSVGElement {
  document.body.innerHTML = `
    <svg class="recharts-surface" width="300" height="120" viewBox="0 0 300 120">
      <g class="recharts-cartesian-grid"><line x1="0" x2="300" y1="10" y2="10" style="stroke: rgb(10, 20, 30)"></line></g>
      <g class="recharts-cartesian-axis-tick"><text style="fill: rgb(40, 50, 60); font-size: 12px">10 km</text></g>
      <path class="recharts-line-curve" d="M0 0L10 10" fill="none" stroke="var(--color-y)" style="stroke: rgb(1, 2, 3); stroke-width: 2px"></path>
    </svg>`;
  const svg = document.querySelector("svg");
  if (!svg) throw new Error("no svg");
  return svg as unknown as SVGSVGElement;
}

const parse = (markup: string) => new DOMParser().parseFromString(markup, "image/svg+xml");

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.classList.remove("dark");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("serializeSvg", () => {
  it("makes a standalone svg of the chart, with its size and the svg namespace", () => {
    const { markup, width, height } = serializeSvg(chart());

    const root = parse(markup).documentElement;
    expect(root.namespaceURI).toBe(SVG);
    expect(root.getAttribute("width")).toBe("300");
    expect(root.getAttribute("height")).toBe("120");
    expect(root.getAttribute("viewBox")).toBe("0 0 300 120");
    expect([width, height]).toEqual([300, 120]);
  });

  it("puts a white background behind everything", () => {
    const { markup } = serializeSvg(chart());

    const background = parse(markup).documentElement.firstElementChild;
    expect(background?.tagName).toBe("rect");
    expect(background?.getAttribute("width")).toBe("100%");
    expect(background?.getAttribute("height")).toBe("100%");
    expect(background?.getAttribute("fill")).toBe("#ffffff");
  });

  it("writes the colors and strokes the chart is drawn with into every element", () => {
    const { markup } = serializeSvg(chart());

    const doc = parse(markup);
    expect(doc.querySelector("path")?.getAttribute("style")).toContain("rgb(1, 2, 3)");
    expect(doc.querySelector("text")?.getAttribute("style")).toContain("rgb(40, 50, 60)");
    expect(doc.querySelector("line")?.getAttribute("style")).toContain("rgb(10, 20, 30)");
  });

  it("leaves no CSS variable behind, since a standalone image cannot resolve it", () => {
    expect(serializeSvg(chart()).markup).not.toContain("var(");
  });

  it("does not touch the chart on the page", () => {
    const svg = chart();

    serializeSvg(svg);

    expect(svg.querySelector("path")?.getAttribute("stroke")).toBe("var(--color-y)");
    expect(svg.firstElementChild?.tagName).toBe("g");
  });

  it("reads the colors in the light theme, so the picture is the same on a dark page", () => {
    document.documentElement.classList.add("dark");
    const real = window.getComputedStyle.bind(window);
    const themeWhenRead: boolean[] = [];
    vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) => {
      themeWhenRead.push(document.documentElement.classList.contains("dark"));
      return real(element, pseudo);
    });

    serializeSvg(chart());

    expect(themeWhenRead.length).toBeGreaterThan(0);
    expect(themeWhenRead.every((dark) => !dark)).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("keeps the page theme even when serializing fails", () => {
    document.documentElement.classList.add("dark");
    vi.spyOn(window, "getComputedStyle").mockImplementation(() => {
      throw new Error("no styles");
    });

    expect(() => serializeSvg(chart())).toThrow("no styles");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

describe("canvasToBytes", () => {
  it("gives the bytes of the PNG of a canvas", async () => {
    const canvas = document.createElement("canvas");
    canvas.toBlob = (callback) =>
      callback({ arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer } as Blob);

    expect(await canvasToBytes(canvas)).toEqual(new Uint8Array([137, 80, 78, 71]));
  });

  it("fails when the browser cannot encode the canvas", async () => {
    const canvas = document.createElement("canvas");
    canvas.toBlob = (callback) => callback(null);

    await expect(canvasToBytes(canvas)).rejects.toThrow();
  });
});

describe("svgToPngBytes", () => {
  it("draws the svg on a white canvas at twice its size and gives the PNG bytes", async () => {
    const drawn: string[] = [];
    const sources: string[] = [];
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(value: string) {
        sources.push(value);
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", FakeImage);
    const context = {
      fillStyle: "",
      fillRect: (...args: number[]) =>
        drawn.push(`fillRect ${context.fillStyle} ${args.join(",")}`),
      drawImage: (_image: unknown, ...args: number[]) => drawn.push(`drawImage ${args.join(",")}`),
    };
    const sizes: number[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
      this: HTMLCanvasElement,
    ) {
      sizes.push(this.width, this.height);
      return context as unknown as CanvasRenderingContext2D;
    } as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
      callback({ arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer } as Blob),
    );

    const bytes = await svgToPngBytes("<svg></svg>", 300, 120);

    expect(bytes).toEqual(new Uint8Array([1, 2, 3]));
    expect(sizes).toEqual([600, 240]);
    expect(drawn).toEqual(["fillRect #ffffff 0,0,600,240", "drawImage 0,0,600,240"]);
    expect(sources[0]).toMatch(/^data:image\/svg\+xml/);
  });

  it("fails when the image cannot be loaded", async () => {
    class BrokenImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal("Image", BrokenImage);

    await expect(svgToPngBytes("<svg></svg>", 10, 10)).rejects.toThrow();
  });
});
