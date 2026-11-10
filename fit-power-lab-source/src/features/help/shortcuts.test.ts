import { describe, expect, it, vi } from "vitest";
import { createTranslator } from "@/app/i18n";
import { MESSAGES } from "@/app/messages";
import { createShortcutBindings, describeShortcut, SHORTCUT_DOCS } from "@/features/help/shortcuts";

const en = createTranslator(MESSAGES, "en");
const es = createTranslator(MESSAGES, "es");

describe("SHORTCUT_DOCS", () => {
  it("gives every shortcut a different key", () => {
    const keys = SHORTCUT_DOCS.map((d) => d.key.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("covers the seven sections by number, help, units and theme", () => {
    const byId = Object.fromEntries(SHORTCUT_DOCS.map((d) => [d.id, d.key]));
    expect(byId).toEqual({
      overview: "1",
      metrics: "2",
      model: "3",
      library: "4",
      tools: "5",
      device: "6",
      settings: "7",
      help: "?",
      units: "u",
      theme: "d",
    });
  });
});

describe("describeShortcut", () => {
  it("names the section in the chosen language", () => {
    const doc = SHORTCUT_DOCS.find((d) => d.id === "model");
    if (!doc) throw new Error("no model shortcut");
    expect(describeShortcut(doc, en)).toBe("Go to Model");
    expect(describeShortcut(doc, es)).toBe("Ir a Modelo");
  });

  it("translates the shortcuts that are not sections", () => {
    const doc = SHORTCUT_DOCS.find((d) => d.id === "units");
    if (!doc) throw new Error("no units shortcut");
    expect(describeShortcut(doc, en)).toBe("Switch between metric and imperial units");
  });

  it("has a text in both languages for every shortcut", () => {
    for (const doc of SHORTCUT_DOCS) {
      expect(describeShortcut(doc, en)).not.toMatch(/^(help|app)\./);
      expect(describeShortcut(doc, es)).not.toMatch(/^(help|app)\./);
    }
  });
});

describe("createShortcutBindings", () => {
  it("makes a binding for each handler given, with its key and description", () => {
    const units = vi.fn();
    const bindings = createShortcutBindings({ units }, en);

    expect(bindings).toHaveLength(1);
    expect(bindings[0]).toMatchObject({
      key: "u",
      description: "Switch between metric and imperial units",
    });
    bindings[0]?.handler();
    expect(units).toHaveBeenCalledTimes(1);
  });

  it("leaves out the shortcuts that have no handler", () => {
    expect(createShortcutBindings({}, en)).toEqual([]);
  });
});
