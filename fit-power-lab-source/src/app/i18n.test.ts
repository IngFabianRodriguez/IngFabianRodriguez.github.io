import { describe, expect, it } from "vitest";
import { createTranslator, mergeMessages } from "@/app/i18n";

const messages = mergeMessages(
  { en: { "a.hello": "Hello", "a.only": "Only English" }, es: { "a.hello": "Hola" } },
  { en: { "b.count": "{n} rides in {place}" }, es: { "b.count": "{n} salidas en {place}" } },
);

describe("createTranslator", () => {
  it("translates by key in the chosen language", () => {
    expect(createTranslator(messages, "es")("a.hello")).toBe("Hola");
    expect(createTranslator(messages, "en")("a.hello")).toBe("Hello");
  });

  it("falls back to English, then to the key itself", () => {
    const t = createTranslator(messages, "es");
    expect(t("a.only")).toBe("Only English");
    expect(t("missing.key")).toBe("missing.key");
  });

  it("fills {placeholders}", () => {
    expect(createTranslator(messages, "es")("b.count", { n: 3, place: "Gotham" })).toBe(
      "3 salidas en Gotham",
    );
  });

  it("leaves unknown placeholders visible instead of failing", () => {
    expect(createTranslator(messages, "en")("b.count", { n: 3 })).toBe("3 rides in {place}");
  });
});
