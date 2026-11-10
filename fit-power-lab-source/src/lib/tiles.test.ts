import { describe, expect, it } from "vitest";
import { tileConfig } from "@/lib/tiles";

describe("tileConfig", () => {
  it("uses OpenStreetMap by default, with its attribution", () => {
    const config = tileConfig({ mode: "osm", customUrl: "", hideEndsM: 0 });

    expect(config.url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(config.attribution).toContain("OpenStreetMap");
  });

  it("uses the user's own tile server when it is a valid template", () => {
    const config = tileConfig({
      mode: "custom",
      customUrl: "https://tiles.example.org/{z}/{x}/{y}.png",
      hideEndsM: 0,
    });

    expect(config.url).toBe("https://tiles.example.org/{z}/{x}/{y}.png");
  });

  it.each([
    ["no placeholders", "https://tiles.example.org/tile.png"],
    ["not a web address", "file:///{z}/{x}/{y}.png"],
    ["empty", ""],
    ["script", "javascript:alert({z}{x}{y})"],
  ])("draws no background when the custom address is not usable (%s)", (_label, customUrl) => {
    expect(tileConfig({ mode: "custom", customUrl, hideEndsM: 0 }).url).toBeNull();
  });

  it("asks for nothing when the background is switched off", () => {
    expect(tileConfig({ mode: "none", customUrl: "", hideEndsM: 0 })).toMatchObject({
      url: null,
      attribution: "",
    });
  });
});
