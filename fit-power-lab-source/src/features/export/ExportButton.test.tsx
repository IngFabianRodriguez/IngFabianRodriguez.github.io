import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyze } from "@/domain/analysis";
import { ExportButton } from "@/features/export/ExportButton";
import { MESG_RECORD } from "@/fit/mesgNum";
import { readFit } from "@/fit/readFit";
import { downloadFile } from "@/lib/download";
import { buildFit } from "@/test/buildFit";

vi.mock("@/lib/download", () => ({ downloadFile: vi.fn() }));

const t0 = new Date("2024-02-25T13:31:00Z");

function analysis() {
  const bytes = buildFit(
    Array.from({ length: 6 }, (_, i) => ({
      timestamp: new Date(t0.getTime() + i * 1000),
      distance: 5 * i,
      altitude: 0,
      speed: 5,
      cadence: 80,
      temperature: 15,
    })),
  );
  return analyze(bytes, { riderKg: 75, bikeKg: 5 });
}

describe("ExportButton", () => {
  beforeEach(() => vi.mocked(downloadFile).mockClear());

  it("downloads a new .fit with the estimated power under a -power name", async () => {
    const user = userEvent.setup();
    const result = analysis();
    render(<ExportButton analysis={result} fileName="2024-02-25.fit" />);

    await user.click(screen.getByRole("button", { name: "Download .fit with power" }));

    expect(downloadFile).toHaveBeenCalledTimes(1);
    const [bytes, name] = vi.mocked(downloadFile).mock.calls[0] ?? [];
    expect(name).toBe("2024-02-25-power.fit");
    const power = readFit(bytes as Uint8Array)
      .messages.filter((m) => m.mesgNum === MESG_RECORD)
      .map((m) => m.fields["power"]);
    expect(power).toEqual(result.watts);
  });
});
