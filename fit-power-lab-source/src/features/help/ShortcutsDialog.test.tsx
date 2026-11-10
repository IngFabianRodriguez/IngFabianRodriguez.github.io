import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import { Input } from "@/components/ui/input";
import { ShortcutsDialog } from "@/features/help/ShortcutsDialog";

const bindings = [
  { key: "1", description: "Go to Overview", handler: vi.fn() },
  { key: "u", description: "Switch units", handler: vi.fn() },
];

describe("ShortcutsDialog", () => {
  it("is closed until the question mark is pressed", async () => {
    const user = userEvent.setup();
    render(<ShortcutsDialog bindings={bindings} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.keyboard("?");

    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument();
  });

  it("lists every binding with its key and the shortcut for the list itself", async () => {
    const user = userEvent.setup();
    render(<ShortcutsDialog bindings={bindings} />);

    await user.keyboard("?");
    const dialog = screen.getByRole("dialog");

    const rows = within(dialog).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      "1Go to Overview",
      "uSwitch units",
      "?Show or hide this list",
    ]);
    expect(within(dialog).getByText("1").tagName).toBe("KBD");
  });

  it("does not repeat the list shortcut when the shell already binds the question mark", async () => {
    const user = userEvent.setup();
    render(<ShortcutsDialog bindings={[{ key: "?", description: "Help", handler: vi.fn() }]} />);

    await user.keyboard("?");

    expect(within(screen.getByRole("dialog")).getAllByRole("listitem")).toHaveLength(1);
  });

  it("closes with Escape and with the question mark again", async () => {
    const user = userEvent.setup();
    render(<ShortcutsDialog bindings={bindings} />);

    await user.keyboard("?");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.keyboard("?");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not open while the user types a question mark in a field", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Input aria-label="Notes" />
        <ShortcutsDialog bindings={bindings} />
      </>,
    );

    await user.click(screen.getByLabelText("Notes"));
    await user.keyboard("why?");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toHaveValue("why?");
  });

  it("has no automatically detectable accessibility violations when open", async () => {
    const user = userEvent.setup();
    render(<ShortcutsDialog bindings={bindings} />);
    await user.keyboard("?");

    expect(await axe(screen.getByRole("dialog"))).toHaveNoViolations();
  });
});
