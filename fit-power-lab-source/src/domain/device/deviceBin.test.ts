import { describe, expect, it } from "vitest";
import { parseDeviceBin } from "@/domain/device/deviceBin";

describe("parseDeviceBin", () => {
  it("reads model, brand, hardware, firmware and serial from the CRLF lines", () => {
    const text = "#PRO,iGS50E,iGPSPORT\r\n#HW,1.0\r\n#AW,1.09\r\n#ID,0xABCDEF0123456789\r\n";

    expect(parseDeviceBin(text)).toEqual({
      model: "iGS50E",
      brand: "iGPSPORT",
      hardware: "1.0",
      firmware: "1.09",
      serial: "0xABCDEF0123456789",
    });
  });

  it("accepts LF line endings, blank lines and stray spaces", () => {
    const text = "\n  #PRO , iGS50E , iGPSPORT \n\n#AW,  2.01 \n";

    expect(parseDeviceBin(text)).toEqual({
      model: "iGS50E",
      brand: "iGPSPORT",
      firmware: "2.01",
    });
  });

  it("leaves out what the file does not say and ignores unknown tags", () => {
    const info = parseDeviceBin("#PRO,iGS50E\r\n#XYZ,whatever\r\n#HW,\r\n");

    expect(info).toEqual({ model: "iGS50E" });
  });

  it("keeps a brand that contains a comma", () => {
    expect(parseDeviceBin("#PRO,Model,Brand, Inc.")).toEqual({
      model: "Model",
      brand: "Brand, Inc.",
    });
  });

  it("returns null when the text is not a Device.bin", () => {
    expect(parseDeviceBin("")).toBeNull();
    expect(parseDeviceBin("just some text\r\nwithout tags")).toBeNull();
    expect(parseDeviceBin("\u0000\u0001\u0002 binary garbage")).toBeNull();
  });
});
