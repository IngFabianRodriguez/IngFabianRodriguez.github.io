import { describe, expect, it } from "vitest";
import { AREA_MESSAGES, MESSAGES } from "@/app/messages";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("the app's translations", () => {
  it("has a Spanish text for every English key, and the other way round", () => {
    const en = Object.keys(MESSAGES.en).sort();
    const es = Object.keys(MESSAGES.es).sort();

    expect(es.filter((key) => !(key in MESSAGES.en))).toEqual([]);
    expect(en.filter((key) => !(key in MESSAGES.es))).toEqual([]);
  });

  it("uses the same placeholders in both languages", () => {
    const mismatched = Object.keys(MESSAGES.en).filter(
      (key) =>
        MESSAGES.es[key] !== undefined &&
        placeholders(MESSAGES.en[key] ?? "").join() !== placeholders(MESSAGES.es[key] ?? "").join(),
    );

    expect(mismatched).toEqual([]);
  });

  it("has no empty text", () => {
    const empty = [...Object.entries(MESSAGES.en), ...Object.entries(MESSAGES.es)]
      .filter(([, text]) => text.trim() === "")
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });

  it("gives every key to one area only, so areas cannot overwrite each other", () => {
    const seen = new Map<string, number>();
    for (const area of AREA_MESSAGES) {
      for (const key of Object.keys(area.en)) seen.set(key, (seen.get(key) ?? 0) + 1);
    }

    expect([...seen].filter(([, count]) => count > 1).map(([key]) => key)).toEqual([]);
  });
});
