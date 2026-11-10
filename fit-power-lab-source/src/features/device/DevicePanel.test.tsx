import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppState } from "@/app/AppContext";
import { buildUserFit } from "@/domain/device/buildUserFit.testutil";
import { readUserProfile } from "@/domain/device/userFit";
import { readFit } from "@/fit/readFit";
import { DevicePanel } from "@/features/device/DevicePanel";
import { memoryDirectory } from "@/features/device/memoryDirectory.testutil";
import { buildFit } from "@/test/buildFit";
import { makeLoadedRide, steadyRecords } from "@/test/fixtures";
import { renderWithApp } from "@/test/renderWithApp";

const download = vi.hoisted(() => vi.fn());
vi.mock("@/lib/download", () => ({ downloadFile: download }));

const DEVICE_BIN = "#PRO,iGS50E,iGPSPORT\r\n#HW,1.0\r\n#AW,1.09\r\n#ID,0xABC123\r\n";
const FIRST = "2024-01-01-08-00-00.fit";
const SECOND = "2024-01-02-08-00-00.fit";

const asFile = (path: string, content: string | Uint8Array) => {
  const file = new File([typeof content === "string" ? content : content.slice().buffer], path);
  Object.defineProperty(file, "webkitRelativePath", { value: `DEVICE/${path}` });
  return file;
};

/** The files of a synthetic device, as a folder field would hand them over. */
function deviceFiles(user: Parameters<typeof buildUserFit>[0] = {}): File[] {
  return [
    asFile("Device.bin", DEVICE_BIN),
    asFile("iGPSPORT/Setting/user.fit", buildUserFit(user)),
    asFile(`iGPSPORT/Activities/${FIRST}`, buildFit(steadyRecords(5))),
    asFile(`iGPSPORT/Activities/${SECOND}`, buildFit(steadyRecords(8))),
    asFile("iGPSPORT/Activities/List.fit", buildFit(steadyRecords(2))),
  ];
}

function WeightsProbe() {
  const { weights } = useAppState();
  return <p>{weights ? `app weights ${weights.riderKg} / ${weights.bikeKg}` : "no weights"}</p>;
}

function renderPanel(initial: Parameters<typeof renderWithApp>[1] = {}) {
  return renderWithApp(
    <>
      <DevicePanel />
      <WeightsProbe />
    </>,
    { weights: { riderKg: 80, bikeKg: 7 }, ...initial },
  );
}

async function chooseDevice(files = deviceFiles()) {
  const user = userEvent.setup();
  await user.upload(screen.getByLabelText("Device folder (file field)"), files);
  await screen.findByText("Folder read: DEVICE");
  return user;
}

const ridesState = (loaded = makeLoadedRide(steadyRecords(60), "ride.fit", "r1")) => ({
  rides: [loaded],
  activeId: loaded.id,
});

/** Gives the page a folder picker, which jsdom does not have. */
function setPicker<T extends ReturnType<typeof vi.fn>>(picker: T): T {
  Object.defineProperty(window, "showDirectoryPicker", {
    value: picker,
    configurable: true,
    writable: true,
  });
  return picker;
}

beforeEach(() => {
  localStorage.clear();
  download.mockReset();
});
afterEach(() => {
  Reflect.deleteProperty(window, "showDirectoryPicker");
});

describe("DevicePanel without a device folder", () => {
  it("says what to do before a folder is chosen", () => {
    renderPanel();

    expect(
      screen.getByText("Choose the device folder to see its model and firmware."),
    ).toBeVisible();
    expect(screen.getByText("Load a ride to check its quality.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Download ZIP" })).toBeDisabled();
    expect(screen.getByText("Choose the device folder to edit its profile.")).toBeVisible();
    expect(screen.queryByText("The device folder has no user.fit.")).toBeNull();
  });

  it("checks the quality of the active ride and warns about the sensor and the speed peaks", () => {
    const ride = makeLoadedRide(
      steadyRecords(60, (i) => ({ cadence: 0, speed: i === 30 ? 25 : 5 })),
      "ride.fit",
      "r1",
    );

    renderPanel(ridesState(ride));

    expect(screen.getByText("99 / 100")).toBeVisible();
    expect(
      screen.getByText(
        "Impossible speed peaks discarded: 1 (largest gain 20 m/s²). The power estimate ignores them.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("No cadence was recorded (cadence is 0 on every record)."),
    ).toBeVisible();
    expect(screen.queryByText("Load a ride to see which sensors recorded data.")).toBeNull();
  });

  it("shows which sensors recorded data in the active ride", () => {
    const ride = makeLoadedRide(
      steadyRecords(30, () => ({ cadence: 0, heartRate: 150 })),
      "ride.fit",
      "r1",
    );

    renderPanel(ridesState(ride));

    const heart = screen.getByText("Heart rate").closest("li");
    const cadence = screen.getByText("Cadence").closest("li");
    expect(heart).toHaveTextContent("Recorded in this ride");
    expect(cadence).toHaveTextContent("No data in this ride");
  });
});

describe("DevicePanel with a device folder", () => {
  it("shows the model, hardware, firmware and serial from Device.bin", async () => {
    renderPanel();
    await chooseDevice();

    const info = screen.getByText("Read from Device.bin.").closest("[data-slot='card']");
    expect(info).toHaveTextContent("iGS50E");
    expect(info).toHaveTextContent("iGPSPORT");
    expect(info).toHaveTextContent("1.0");
    expect(info).toHaveTextContent("1.09");
    expect(info).toHaveTextContent("0xABC123");
  });

  it("warns when a paired sensor left no data in the ride", async () => {
    const ride = makeLoadedRide(
      steadyRecords(30, () => ({ cadence: 80, heartRate: 0 })),
      "ride.fit",
      "r1",
    );
    renderPanel(ridesState(ride));
    await chooseDevice(deviceFiles({ hrmAnt: 777, speedCadenceAnt: 4242 }));

    expect(screen.getByText("Heart rate").closest("li")).toHaveTextContent(
      "Paired, but no data in this ride",
    );
    expect(screen.getByText("Cadence").closest("li")).toHaveTextContent("Recorded in this ride");
    expect(screen.getByText("Speed and cadence").closest("li")).toHaveTextContent("Paired");
    expect(screen.getByText("Power").closest("li")).toHaveTextContent("Not paired");
  });

  it("tells when the folder holds nothing of a device", async () => {
    renderPanel();
    const user = userEvent.setup();

    await user.upload(
      screen.getByLabelText("Device folder (file field)"),
      asFile("notes.txt", "hello"),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("No device files were found");
  });

  it("opens the device for reading only when the browser has a folder picker", async () => {
    const root = memoryDirectory("F:", { "Device.bin": new TextEncoder().encode(DEVICE_BIN) });
    const picker = vi.fn().mockResolvedValue(root);
    setPicker(picker);
    renderPanel();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Choose device folder" }));

    expect(await screen.findByText("Folder read: F:")).toBeVisible();
    expect(picker).toHaveBeenCalledWith({ mode: "read" });
    expect(root.writes).toEqual([]);
  });
});

describe("backup", () => {
  it("downloads every activity as a ZIP and remembers it", async () => {
    renderPanel();
    const user = await chooseDevice();
    expect(
      await screen.findByText("2 activities on the device, 2 not backed up yet."),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Download ZIP" }));

    await waitFor(() => expect(download).toHaveBeenCalledTimes(1));
    const [zip, name] = download.mock.calls[0] as [Uint8Array, string];
    expect(name).toMatch(/^igpsport-activities-\d{4}-\d{2}-\d{2}\.zip$/);
    const text = new TextDecoder("latin1").decode(zip);
    expect(text).toContain(FIRST);
    expect(text).toContain(SECOND);
    expect(text).not.toContain("List.fit");
    expect(await screen.findByText(/ZIP download started with 2 activities/)).toBeVisible();
    expect(screen.getByText("2 activities on the device, 0 not backed up yet.")).toBeVisible();
    expect(screen.getByText("Nothing new to back up.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Download ZIP" })).toBeDisabled();
  });

  it("can pack everything again when asked not to skip the backed up ones", async () => {
    renderPanel();
    const user = await chooseDevice();
    await screen.findByText("2 activities on the device, 2 not backed up yet.");
    await user.click(screen.getByRole("button", { name: "Download ZIP" }));
    await screen.findByText(/ZIP download started with 2 activities/);

    await user.click(screen.getByRole("checkbox", { name: "Only activities not backed up yet" }));
    await user.click(screen.getByRole("button", { name: "Download ZIP" }));

    await waitFor(() => expect(download).toHaveBeenCalledTimes(2));
  });

  it("copies the activities into a folder the user picks and never overwrites", async () => {
    const target = memoryDirectory("my-backup", { [FIRST]: Uint8Array.from([9, 9, 9]) });
    const picker = setPicker(vi.fn().mockResolvedValue(target));
    renderPanel();
    const user = await chooseDevice();
    await screen.findByText("2 activities on the device, 2 not backed up yet.");

    await user.click(screen.getByRole("button", { name: "Copy to a folder…" }));

    expect(
      await screen.findByText(/Copied 1; already there 0;.*content 1; failed 0\./),
    ).toBeVisible();
    expect(picker).toHaveBeenCalledWith({ mode: "readwrite" });
    expect(Array.from(target.files.get(FIRST) ?? [])).toEqual([9, 9, 9]);
    expect(target.files.has(SECOND)).toBe(true);
    expect(target.files.has("List.fit")).toBe(false);
    expect(screen.getByText("2 activities on the device, 1 not backed up yet.")).toBeVisible();
  });

  it("refuses a folder that looks like the device", async () => {
    const target = memoryDirectory("F:", { "Device.bin": new Uint8Array() });
    setPicker(vi.fn().mockResolvedValue(target));
    renderPanel();
    const user = await chooseDevice();
    await screen.findByText("2 activities on the device, 2 not backed up yet.");

    await user.click(screen.getByRole("button", { name: "Copy to a folder…" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That folder looks like the device.",
    );
    expect(target.writes).toEqual([]);
  });

  it("does nothing when the user closes the folder picker", async () => {
    const picker = setPicker(vi.fn().mockRejectedValue(new DOMException("closed", "AbortError")));
    renderPanel();
    const user = await chooseDevice();
    await screen.findByText("2 activities on the device, 2 not backed up yet.");

    await user.click(screen.getByRole("button", { name: "Copy to a folder…" }));

    await waitFor(() => expect(picker).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("guide to free space", () => {
  it("marks the activities that are backed up and leaves the deleting to the user", async () => {
    renderPanel();
    const user = await chooseDevice();
    await screen.findByText("2 activities on the device, 2 not backed up yet.");
    const table = within(
      screen.getByRole("region", { name: "Activities on the device" }),
    ).getByRole("table");
    expect(within(table).getAllByText("Not backed up")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Download ZIP" }));
    await screen.findByText(/ZIP download started/);

    expect(within(table).getAllByText("Backed up")).toHaveLength(2);
    expect(
      screen.getByText(/2 of 2 activities are backed up; deleting them would free/),
    ).toBeVisible();
    expect(screen.getByText(/Delete only the files marked Backed up/)).toBeVisible();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });

  it("does not call an activity backed up when its content changed", async () => {
    renderPanel();
    const user = await chooseDevice();
    await screen.findByText("2 activities on the device, 2 not backed up yet.");
    await user.click(screen.getByRole("button", { name: "Download ZIP" }));
    await screen.findByText(/ZIP download started/);

    await user.upload(screen.getByLabelText("Device folder (file field)"), [
      asFile("Device.bin", DEVICE_BIN),
      asFile(`iGPSPORT/Activities/${FIRST}`, buildFit(steadyRecords(5))),
      asFile(`iGPSPORT/Activities/${SECOND}`, buildFit(steadyRecords(9))),
    ]);

    expect(
      await screen.findByText("2 activities on the device, 1 not backed up yet."),
    ).toBeVisible();
  });
});

describe("profile", () => {
  it("shows the device values and offers the edit with before and after", async () => {
    renderPanel();
    const user = await chooseDevice(
      deviceFiles({ riderKg: 72, bikeKg: 9, age: 35, heightM: 1.75 }),
    );

    expect(screen.getByLabelText("Rider weight (kg)")).toHaveValue("72");
    expect(screen.getByText("No changes yet.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Download edited user.fit" })).toBeDisabled();

    await user.clear(screen.getByLabelText("Rider weight (kg)"));
    await user.type(screen.getByLabelText("Rider weight (kg)"), "74,5");

    const row = screen.getByRole("cell", { name: "Rider weight" }).closest("tr");
    expect(row).toHaveTextContent("72 kg");
    expect(row).toHaveTextContent("74.5 kg");
    expect(screen.getByRole("button", { name: "Download edited user.fit" })).toBeEnabled();
  });

  it("downloads a user.fit with only the edited values changed", async () => {
    renderPanel();
    const original = buildUserFit({ riderKg: 72, bikeKg: 9, age: 35, heightM: 1.75 });
    const user = await chooseDevice(
      deviceFiles({ riderKg: 72, bikeKg: 9, age: 35, heightM: 1.75 }),
    );

    await user.clear(screen.getByLabelText("Age (years)"));
    await user.type(screen.getByLabelText("Age (years)"), "36");
    await user.click(screen.getByRole("button", { name: "Download edited user.fit" }));

    expect(download).toHaveBeenCalledTimes(1);
    const [bytes, name] = download.mock.calls[0] as [Uint8Array, string];
    expect(name).toBe("user.fit");
    expect(readUserProfile(readFit(bytes))).toEqual({
      ...readUserProfile(readFit(original)),
      age: 36,
    });
    expect(
      await screen.findByText(/Copy it into iGPSPORT\/Setting\/ on the device yourself/),
    ).toBeVisible();
  });

  it("shows what is wrong with a value and does not offer the download", async () => {
    renderPanel();
    const user = await chooseDevice();

    await user.clear(screen.getByLabelText("Rider weight (kg)"));
    await user.type(screen.getByLabelText("Rider weight (kg)"), "5");

    expect(screen.getByText("Enter a value between 20 kg - 250 kg.")).toBeVisible();
    expect(screen.getByLabelText("Rider weight (kg)")).toBeInvalid();
    expect(screen.getByRole("button", { name: "Download edited user.fit" })).toBeDisabled();
  });

  it("shows the weights in the chosen units", async () => {
    renderPanel({ units: "imperial" });
    await chooseDevice(deviceFiles({ riderKg: 70, bikeKg: 9.5 }));

    expect(screen.getByLabelText("Rider weight (lb)")).toHaveValue("154.3");
  });

  it("uses the weights of the device in the app", async () => {
    renderPanel();
    const user = await chooseDevice(deviceFiles({ riderKg: 72.5, bikeKg: 8.4 }));
    expect(screen.getByText("app weights 80 / 7")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Use the weights from the device" }));

    expect(screen.getByText("app weights 72.5 / 8.4")).toBeVisible();
    expect(screen.getByText("The app now uses the weights of the device.")).toBeVisible();
  });

  it("does not take device weights the app would reject", async () => {
    renderPanel();
    const user = await chooseDevice(deviceFiles({ riderKg: 72, bikeKg: 2 }));

    await user.click(screen.getByRole("button", { name: "Use the weights from the device" }));

    expect(screen.getByText("app weights 80 / 7")).toBeVisible();
    expect(
      screen.getByText("The weights of the device are outside what the app accepts."),
    ).toBeVisible();
  });

  it("downloads a user.fit that carries the weights of the app", async () => {
    renderPanel();
    const user = await chooseDevice(deviceFiles({ riderKg: 72, bikeKg: 9, age: 35 }));

    await user.click(
      screen.getByRole("button", { name: "Download user.fit with the app weights" }),
    );

    const [bytes, name] = download.mock.calls[0] as [Uint8Array, string];
    expect(name).toBe("user.fit");
    expect(readUserProfile(readFit(bytes))).toMatchObject({ riderKg: 80, bikeKg: 7, age: 35 });
  });

  it("says when the device has no user.fit", async () => {
    renderPanel();
    await chooseDevice([asFile("Device.bin", DEVICE_BIN)]);

    expect(screen.getByText("The device folder has no user.fit.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Use the weights from the device" })).toBeDisabled();
  });

  it("says when user.fit cannot be read", async () => {
    renderPanel();
    await chooseDevice([
      asFile("Device.bin", DEVICE_BIN),
      asFile("iGPSPORT/Setting/user.fit", new Uint8Array(40)),
    ]);

    expect(screen.getByText("The user.fit of the device could not be read.")).toBeVisible();
  });
});

describe("accessibility", () => {
  it("has no automatically detectable violations, with a ride and a device", async () => {
    const { container } = renderPanel(ridesState());
    await chooseDevice();
    await screen.findByText("2 activities on the device, 2 not backed up yet.");

    expect(await axe(container)).toHaveNoViolations();
  });
});
