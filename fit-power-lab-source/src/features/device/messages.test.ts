import { describe, expect, it } from "vitest";
import type { QualityCode } from "@/domain/quality/assessQuality";
import { messages } from "@/features/device/messages";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const QUALITY_CODES: Record<QualityCode, true> = {
  "too-short": true,
  "gps-none": true,
  "gps-lost": true,
  gaps: true,
  pauses: true,
  "altitude-jumps": true,
  "speed-artifacts": true,
  "no-heart-rate": true,
  "heart-rate-dropouts": true,
  "no-cadence": true,
};

describe("device messages", () => {
  it("has every key in both languages with the same placeholders", () => {
    expect(Object.keys(messages.es).sort()).toEqual(Object.keys(messages.en).sort());
    for (const [key, text] of Object.entries(messages.en)) {
      expect(placeholders(messages.es[key] ?? ""), key).toEqual(placeholders(text));
    }
  });

  it("only uses keys that start with the area name", () => {
    for (const key of Object.keys(messages.en)) expect(key.startsWith("device.")).toBe(true);
  });

  it("can say every quality finding and every sensor status", () => {
    for (const code of Object.keys(QUALITY_CODES)) {
      expect(messages.en[`device.quality.${code}`], code).toBeTruthy();
    }
    for (const status of [
      "recorded",
      "paired-no-data",
      "not-paired",
      "no-data",
      "paired",
      "unknown",
    ]) {
      expect(messages.en[`device.sensorStatus.${status}`], status).toBeTruthy();
    }
  });
});
