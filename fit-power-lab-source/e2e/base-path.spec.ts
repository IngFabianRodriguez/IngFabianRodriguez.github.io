import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

// The site is published inside a folder of a larger site (`/fit-power-lab/`), so the built page
// must not point at the root of the server.
test.describe("the production build can live in any folder", () => {
  const dist = (file: string) => readFileSync(resolve(process.cwd(), "dist", file), "utf8");

  test("index.html refers to its files with relative addresses", () => {
    const html = dist("index.html");
    const addresses = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((m) => m[1] ?? "");
    const local = addresses.filter((a) => !/^(?:[a-z]+:)?\/\//i.test(a) && !a.startsWith("#"));

    expect(local.length).toBeGreaterThan(0);
    expect(local.filter((a) => a.startsWith("/"))).toEqual([]);
  });

  test("the web manifest and its icons are relative too", () => {
    const manifest = JSON.parse(dist("manifest.webmanifest")) as {
      start_url: string;
      scope: string;
      icons: { src: string }[];
    };

    expect([
      manifest.start_url,
      manifest.scope,
      ...manifest.icons.map((i) => i.src),
    ]).not.toContainEqual(expect.stringMatching(/^\//));
  });
});
