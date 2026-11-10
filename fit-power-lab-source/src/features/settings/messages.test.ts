import { describe, expect, it } from "vitest";
import { messages } from "@/features/settings/messages";

describe("settings and help messages", () => {
  it("have the same keys in English and Spanish", () => {
    expect(Object.keys(messages.es).sort()).toEqual(Object.keys(messages.en).sort());
  });

  it("use only the settings. and help. prefixes, so they cannot clash with other areas", () => {
    for (const key of Object.keys(messages.en)) expect(key).toMatch(/^(settings|help)\./);
  });

  it("keep the same placeholders in both languages", () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    for (const [key, text] of Object.entries(messages.en)) {
      expect(placeholders(messages.es[key] ?? "")).toEqual(placeholders(text));
    }
  });
});
