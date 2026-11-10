import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadFile } from "@/lib/download";

describe("downloadFile", () => {
  afterEach(() => vi.restoreAllMocks());

  it("offers the bytes as a file download with the given name and releases the URL", async () => {
    vi.useFakeTimers();
    const created: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob | MediaSource) => {
      created.push(blob as Blob);
      return "blob:fit-power";
    });
    URL.revokeObjectURL = vi.fn();
    const clicked: { href: string; download: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push({ href: this.href, download: this.download });
    });

    downloadFile(new Uint8Array([1, 2, 3]), "ride-power.fit");

    expect(clicked).toEqual([{ href: "blob:fit-power", download: "ride-power.fit" }]);
    expect(new Uint8Array(await created[0]!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    await vi.runAllTimersAsync();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fit-power");
    vi.useRealTimers();
  });
});
