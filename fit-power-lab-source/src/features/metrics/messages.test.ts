import { describe, expect, it } from "vitest";
import { messages } from "@/features/metrics/messages";

const sources = import.meta.glob("./*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Keys the components build from a variable, which no source scan can see. */
const DYNAMIC_KEYS = [
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => `metrics.zone.power.${n}`),
  ...[1, 2, 3, 4, 5].map((n) => `metrics.zone.heartRate.${n}`),
  ...["none", "4", "3", "2", "1", "hc"].map((c) => `metrics.category.${c}`),
];

describe("metrics messages", () => {
  it("has the same keys in English and Spanish, none of them empty", () => {
    expect(Object.keys(messages.es).sort()).toEqual(Object.keys(messages.en).sort());
    for (const language of [messages.en, messages.es]) {
      for (const text of Object.values(language)) expect(text.trim()).not.toBe("");
    }
  });

  it("defines every key that the components use", () => {
    const used = new Set(DYNAMIC_KEYS);
    for (const [file, source] of Object.entries(sources)) {
      if (file.endsWith(".test.tsx")) continue;
      for (const match of source.matchAll(/"(metrics\.[A-Za-z0-9.]+)"/g)) {
        if (match[1]) used.add(match[1]);
      }
    }

    expect(used.size).toBeGreaterThan(100);
    const missing = [...used].filter((key) => !(key in messages.en) || !(key in messages.es));
    expect(missing).toEqual([]);
  });

  it("keeps the same placeholders in both languages", () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    for (const [key, text] of Object.entries(messages.en)) {
      expect(placeholders(messages.es[key] ?? ""), key).toEqual(placeholders(text));
    }
  });
});
