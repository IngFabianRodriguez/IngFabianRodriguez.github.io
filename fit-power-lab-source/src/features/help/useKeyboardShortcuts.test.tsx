import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useKeyboardShortcuts } from "@/features/help/useKeyboardShortcuts";

type Binding = Parameters<typeof useKeyboardShortcuts>[0][number];

function Harness({ bindings }: { bindings: Binding[] }) {
  useKeyboardShortcuts(bindings);
  return (
    <div>
      <Input aria-label="Field" />
      <Textarea aria-label="Notes" />
      <div aria-label="Editable" contentEditable suppressContentEditableWarning role="textbox" />
    </div>
  );
}

describe("useKeyboardShortcuts", () => {
  it("runs the handler of the key pressed", async () => {
    const one = vi.fn();
    const two = vi.fn();
    const user = userEvent.setup();
    render(
      <Harness
        bindings={[
          { key: "1", description: "One", handler: one },
          { key: "2", description: "Two", handler: two },
        ]}
      />,
    );

    await user.keyboard("2");

    expect(two).toHaveBeenCalledTimes(1);
    expect(one).not.toHaveBeenCalled();
  });

  it("matches letters in either case and the question mark", async () => {
    const units = vi.fn();
    const help = vi.fn();
    const user = userEvent.setup();
    render(
      <Harness
        bindings={[
          { key: "u", description: "Units", handler: units },
          { key: "?", description: "Help", handler: help },
        ]}
      />,
    );

    await user.keyboard("U");
    await user.keyboard("?");

    expect(units).toHaveBeenCalledTimes(1);
    expect(help).toHaveBeenCalledTimes(1);
  });

  it("does nothing while the user types in a field", async () => {
    const handler = vi.fn();
    const user = userEvent.setup();
    const { getByLabelText } = render(
      <Harness bindings={[{ key: "1", description: "One", handler }]} />,
    );

    await user.click(getByLabelText("Field"));
    await user.keyboard("1");
    await user.click(getByLabelText("Notes"));
    await user.keyboard("1");
    await user.click(getByLabelText("Editable"));
    await user.keyboard("1");

    expect(handler).not.toHaveBeenCalled();
    expect(getByLabelText("Field")).toHaveValue("1");
  });

  it("works again after leaving the field", async () => {
    const handler = vi.fn();
    const user = userEvent.setup();
    const { getByLabelText } = render(
      <Harness bindings={[{ key: "1", description: "One", handler }]} />,
    );

    await user.click(getByLabelText("Field"));
    await user.keyboard("1");
    await user.click(document.body);
    await user.keyboard("1");

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("ignores a key pressed with Ctrl, Alt or Meta, which belongs to the browser", async () => {
    const handler = vi.fn();
    const user = userEvent.setup();
    render(<Harness bindings={[{ key: "r", description: "Run", handler }]} />);

    await user.keyboard("{Control>}r{/Control}");
    await user.keyboard("{Alt>}r{/Alt}");
    await user.keyboard("{Meta>}r{/Meta}");

    expect(handler).not.toHaveBeenCalled();
  });

  it("uses the latest handler without needing a new subscription", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <Harness bindings={[{ key: "1", description: "", handler: first }]} />,
    );

    rerender(<Harness bindings={[{ key: "1", description: "", handler: second }]} />);
    await user.keyboard("1");

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("stops listening when the component goes away", async () => {
    const handler = vi.fn();
    const user = userEvent.setup();
    const { unmount } = render(<Harness bindings={[{ key: "1", description: "One", handler }]} />);

    unmount();
    await user.keyboard("1");

    expect(handler).not.toHaveBeenCalled();
  });
});
