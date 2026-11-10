import { describe, expect, it } from "vitest";
import { formatBytes } from "@/features/device/format";

describe("formatBytes", () => {
  it("uses the unit that keeps the number short", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
    expect(formatBytes(5 * 1024 * 1024 + 300 * 1024)).toBe("5.3 MB");
  });
});
