import { downloadFile } from "@/lib/download";

const SVG_NS = "http://www.w3.org/2000/svg";
const WHITE = "#ffffff";

/** Properties a chart is drawn with; a standalone image has no stylesheet to take them from. */
const DRAWING_PROPERTIES = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
];

export interface SerializedSvg {
  markup: string;
  width: number;
  height: number;
}

function build(svg: SVGSVGElement): SerializedSvg {
  const box = svg.getBoundingClientRect();
  const width = Number(svg.getAttribute("width")) || box.width || 800;
  const height = Number(svg.getAttribute("height")) || box.height || 200;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  const originals = svg.querySelectorAll("*");
  const copies = clone.querySelectorAll("*");
  originals.forEach((original, index) => {
    const copy = copies[index];
    if (!copy) return;
    const computed = window.getComputedStyle(original);
    const declarations = DRAWING_PROPERTIES.flatMap((property) => {
      const value = computed.getPropertyValue(property);
      return value ? [`${property}: ${value}`] : [];
    });
    // A color given as var(--x) in an attribute or a style means nothing outside the page.
    for (const attribute of ["fill", "stroke"]) {
      if (copy.getAttribute(attribute)?.includes("var(")) copy.removeAttribute(attribute);
    }
    if (declarations.length > 0) copy.setAttribute("style", declarations.join("; "));
    else copy.removeAttribute("style");
  });

  for (const attribute of ["class", "style", "role", "tabindex"]) clone.removeAttribute(attribute);
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const background = document.createElementNS(SVG_NS, "rect");
  background.setAttribute("width", "100%");
  background.setAttribute("height", "100%");
  background.setAttribute("fill", WHITE);
  clone.insertBefore(background, clone.firstChild);

  return { markup: new XMLSerializer().serializeToString(clone), width, height };
}

/**
 * A standalone svg of a rendered chart: the styles it is drawn with are written into each element
 * and a white background goes behind it. Colors are read in the light theme, so the picture looks
 * the same whichever theme the page is in; the page itself is not touched.
 */
export function serializeSvg(svg: SVGSVGElement): SerializedSvg {
  const root = document.documentElement;
  const wasDark = root.classList.contains("dark");
  if (wasDark) root.classList.remove("dark");
  try {
    return build(svg);
  } finally {
    if (wasDark) root.classList.add("dark");
  }
}

/** The bytes of the PNG a canvas shows. */
export function canvasToBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("The canvas could not be encoded as a PNG."));
        return;
      }
      blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
    }, "image/png");
  });
}

/** Draws a standalone svg on a white canvas, `scale` times its size, and returns the PNG bytes. */
export function svgToPngBytes(
  markup: string,
  width: number,
  height: number,
  scale = 2,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("The chart image could not be loaded."));
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("The browser has no 2D canvas."));
        return;
      }
      context.fillStyle = WHITE;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvasToBytes(canvas).then(resolve, reject);
    };
    // A data address, not a blob one, keeps the canvas from being marked as tainted.
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
}

/** Text safe to use in a file name. */
export function safeFileName(text: string): string {
  const cleaned = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "chart";
}

export function downloadSvgImage(svg: SVGSVGElement, baseName: string): void {
  const { markup } = serializeSvg(svg);
  downloadFile(new TextEncoder().encode(markup), `${safeFileName(baseName)}.svg`);
}

export async function downloadPngImage(svg: SVGSVGElement, baseName: string): Promise<void> {
  const { markup, width, height } = serializeSvg(svg);
  downloadFile(await svgToPngBytes(markup, width, height), `${safeFileName(baseName)}.png`);
}
