export interface DeviceInfo {
  model?: string;
  brand?: string;
  /** Hardware version, as written (for example "1.0"). */
  hardware?: string;
  /** Firmware version, as written (for example "1.09"). */
  firmware?: string;
  /** Hexadecimal serial, as written. */
  serial?: string;
}

/**
 * Reads the text file `Device.bin` found at the root of the bike computer: one `#TAG,value` line
 * each for `PRO` (model, brand), `HW`, `AW` (firmware) and `ID` (serial). Missing or empty values
 * are left out; unknown tags are ignored. Null when no known tag is present at all.
 */
export function parseDeviceBin(text: string): DeviceInfo | null {
  const info: DeviceInfo = {};

  for (const line of text.split(/\r?\n/)) {
    const [rawTag, ...rest] = line.trim().split(",");
    if (rawTag === undefined || !rawTag.startsWith("#")) continue;
    const tag = rawTag.slice(1).trim().toUpperCase();
    const values = rest.map((value) => value.trim());
    const first = values[0] ?? "";

    switch (tag) {
      case "PRO": {
        if (first !== "") info.model = first;
        const brand = values.slice(1).join(", ");
        if (brand !== "") info.brand = brand;
        break;
      }
      case "HW":
        if (first !== "") info.hardware = first;
        break;
      case "AW":
        if (first !== "") info.firmware = first;
        break;
      case "ID":
        if (first !== "") info.serial = first;
        break;
    }
  }

  return Object.keys(info).length > 0 ? info : null;
}
