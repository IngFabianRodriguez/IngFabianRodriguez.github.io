import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Decoder, Stream } from "@garmin/fitsdk";
import { axe } from "vitest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyze } from "@/domain/analysis";
import { rideFromFit } from "@/domain/ride";
import { readFit } from "@/fit/readFit";
import { DEFAULT_MODEL_SETTINGS } from "@/domain/modelSettings";
import { buildActivityFit } from "@/domain/tools/testing";
import { ExportButton } from "@/features/export/ExportButton";
import { downloadFile } from "@/lib/download";
import { buildFit } from "@/test/buildFit";
import { steadyRecords } from "@/test/fixtures";

vi.mock("@/lib/download", () => ({ downloadFile: vi.fn() }));

const weights = { riderKg: 75, bikeKg: 5 };
const analysis = (withSession = true) => {
  const records = steadyRecords(6);
  return analyze(withSession ? buildActivityFit(records) : buildFit(records), weights);
};

const lastDownload = () => {
  const [bytes, name] = vi.mocked(downloadFile).mock.calls.at(-1) ?? [];
  return { bytes: bytes as Uint8Array, name: name as string };
};
const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const decode = (bytes: Uint8Array) =>
  new Decoder(Stream.fromArrayBuffer(bytes.slice().buffer)).read();

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /more exports/i }));
}

describe("ExportButton menu", () => {
  beforeEach(() => vi.mocked(downloadFile).mockClear());

  it("downloads the CSV, GPX, TCX and JSON under names derived from the ride file", async () => {
    const user = userEvent.setup();
    render(<ExportButton analysis={analysis()} fileName="2024-02-25.fit" />);

    const expected: [RegExp, string, string][] = [
      [/^CSV/, "2024-02-25.csv", "time_utc,elapsed_s"],
      [/^GPX/, "2024-02-25.gpx", "<gpx"],
      [/^TCX/, "2024-02-25.tcx", "<TrainingCenterDatabase"],
      [/^JSON/, "2024-02-25.json", '"format": "fit-power-lab/analysis"'],
    ];
    for (const [label, name, start] of expected) {
      await openMenu(user);
      await user.click(await screen.findByRole("menuitem", { name: label }));
      expect(lastDownload().name).toBe(name);
      expect(text(lastDownload().bytes)).toContain(start);
    }
    expect(downloadFile).toHaveBeenCalledTimes(4);
  });

  it("records the settings in the JSON when the caller gives them", async () => {
    const user = userEvent.setup();
    render(
      <ExportButton
        analysis={analysis()}
        fileName="a.fit"
        settings={{ weights, model: DEFAULT_MODEL_SETTINGS }}
      />,
    );

    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /^JSON/ }));

    const doc = JSON.parse(text(lastDownload().bytes)) as { settings: { weights: unknown } };
    expect(doc.settings.weights).toEqual(weights);
  });

  it("disables the GPX export for a ride without GPS", async () => {
    const user = userEvent.setup();
    const noGps = analyze(
      buildFit(steadyRecords(6, () => ({ lat: undefined as never, lon: undefined as never }))),
      weights,
    );
    render(<ExportButton analysis={noGps} fileName="a.fit" />);

    await openMenu(user);

    expect(await screen.findByRole("menuitem", { name: /^GPX/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("marks the power as estimated by default, so the file never reads back as a meter reading", async () => {
    const user = userEvent.setup();
    render(<ExportButton analysis={analysis()} fileName="a.fit" />);

    await user.click(screen.getByRole("button", { name: "Download .fit with power" }));

    const reloaded = rideFromFit(readFit(lastDownload().bytes));
    expect(reloaded.samples.length).toBeGreaterThan(0);
    expect(reloaded.samples.every((s) => s.power === undefined)).toBe(true);
  });

  it("can leave the mark out when the user chooses to, and says what that costs", async () => {
    const user = userEvent.setup();
    render(<ExportButton analysis={analysis()} fileName="a.fit" />);

    await openMenu(user);
    const mark = await screen.findByRole("menuitemcheckbox", { name: /mark power/i });
    expect(mark).toBeChecked();
    expect(mark).toHaveAccessibleName(/recommended/i);
    await user.click(mark);
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Download .fit with power" }));

    expect(decode(lastDownload().bytes).messages.developerDataIdMesgs).toBeUndefined();
  });

  it("applies the FIT options chosen in the menu to the .fit download", async () => {
    const user = userEvent.setup();
    render(<ExportButton analysis={analysis()} fileName="a.fit" />);

    await openMenu(user);
    await user.click(await screen.findByRole("menuitemcheckbox", { name: /update session/i }));
    await user.click(screen.getByRole("menuitemcheckbox", { name: /new identity/i }));
    expect(screen.getByRole("menuitemcheckbox", { name: /mark power/i })).toBeChecked();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Download .fit with power" }));

    const { bytes, name } = lastDownload();
    expect(name).toBe("a-power.fit");
    const messages = decode(bytes).messages;
    expect(messages.developerDataIdMesgs).toHaveLength(1);
    expect(messages.sessionMesgs?.[0]?.avgPower).toBeGreaterThanOrEqual(0);
    expect(messages.fileIdMesgs?.[0]?.serialNumber).not.toBe(1234);
  });

  it("has no accessibility violations, closed or open", async () => {
    const user = userEvent.setup();
    const { container } = render(<ExportButton analysis={analysis()} fileName="a.fit" />);
    expect(await axe(container)).toHaveNoViolations();

    await openMenu(user);
    await screen.findByRole("menu");
    // The menu is portaled outside any landmark only because the test renders a fragment.
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
