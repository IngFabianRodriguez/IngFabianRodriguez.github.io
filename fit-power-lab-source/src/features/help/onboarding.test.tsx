import { act, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { Button } from "@/components/ui/button";
import { OnboardingDialog } from "@/features/help/OnboardingDialog";
import { ONBOARDING_STORAGE_KEY, useOnboarding } from "@/features/help/useOnboarding";
import { renderWithApp } from "@/test/renderWithApp";

beforeEach(() => localStorage.clear());

function Connected() {
  const onboarding = useOnboarding();
  return (
    <>
      <OnboardingDialog open={onboarding.open} onOpenChange={onboarding.setOpen} />
      <Button onClick={onboarding.show}>Again</Button>
    </>
  );
}

describe("useOnboarding", () => {
  it("is open the first time", () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.open).toBe(true);
  });

  it("is closed once it was dismissed, also in a later visit", () => {
    const first = renderHook(() => useOnboarding());
    act(() => first.result.current.setOpen(false));
    expect(first.result.current.open).toBe(false);
    first.unmount();

    const later = renderHook(() => useOnboarding());
    expect(later.result.current.open).toBe(false);
  });

  it("stays open in a later visit if it was never dismissed", () => {
    renderHook(() => useOnboarding()).unmount();
    expect(renderHook(() => useOnboarding()).result.current.open).toBe(true);
  });

  it("opens again with show, without forgetting that it was seen", () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ seen: true }));
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.open).toBe(false);

    act(() => result.current.show());
    expect(result.current.open).toBe(true);

    act(() => result.current.setOpen(false));
    expect(result.current.open).toBe(false);
  });

  it("opens the dialog of another part of the page when show is called", () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ seen: true }));
    const shell = renderHook(() => useOnboarding());
    const settings = renderHook(() => useOnboarding());

    act(() => settings.result.current.show());

    expect(shell.result.current.open).toBe(true);
  });

  it.each([
    ["not JSON", "yes"],
    ["a wrong type", JSON.stringify({ seen: "true" })],
    ["a list", JSON.stringify([true])],
    ["null", "null"],
    ["seen false", JSON.stringify({ seen: false })],
  ])("shows it again when the saved flag is %s", (_name, stored) => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, stored);
    expect(renderHook(() => useOnboarding()).result.current.open).toBe(true);
  });

  it("still works when storage is not available", () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("denied");
    };
    try {
      const { result } = renderHook(() => useOnboarding());
      expect(result.current.open).toBe(true);
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});

describe("OnboardingDialog", () => {
  it("explains that the watts are an estimate and from what", () => {
    renderWithApp(<OnboardingDialog open onOpenChange={() => undefined} />);
    const dialog = screen.getByRole("dialog", { name: "How your power is estimated" });

    expect(within(dialog).getByText(/does not measure watts/)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/weight and the bike's, the slope of the road, your speed/),
    ).toBeInTheDocument();
  });

  it("names what makes the estimate less exact", () => {
    renderWithApp(<OnboardingDialog open onOpenChange={() => undefined} />);
    const dialog = screen.getByRole("dialog");

    for (const cause of [/Wind/, /Riding behind someone/, /riding position/, /Speed noise/]) {
      expect(within(dialog).getByText(cause)).toBeInTheDocument();
    }
  });

  it("says that nothing leaves the computer except the map and terrain tiles", () => {
    renderWithApp(<OnboardingDialog open onOpenChange={() => undefined} />);

    expect(screen.getByText(/not uploaded/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /only things that go out are the requests for the map tiles and for the terrain tiles of the 3D video/,
      ),
    ).toBeInTheDocument();
  });

  it("is written in Spanish when the app is in Spanish", () => {
    renderWithApp(<OnboardingDialog open onOpenChange={() => undefined} />, { locale: "es" });

    expect(screen.getByRole("dialog", { name: "Cómo se estima tu potencia" })).toBeInTheDocument();
    expect(
      screen.getByText(/Lo único que sale son las peticiones de las teselas/),
    ).toBeInTheDocument();
  });

  it("is not shown while closed", () => {
    renderWithApp(<OnboardingDialog open={false} onOpenChange={() => undefined} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes from its button and remembers it, then reopens from outside", async () => {
    const user = userEvent.setup();
    renderWithApp(<Connected />);

    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY) ?? "null")).toEqual({
      seen: true,
    });

    await user.click(screen.getByRole("button", { name: "Again" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    const user = userEvent.setup();
    renderWithApp(<Connected />);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has no automatically detectable accessibility violations", async () => {
    renderWithApp(<OnboardingDialog open onOpenChange={() => undefined} />);

    expect(await axe(screen.getByRole("dialog"))).toHaveNoViolations();
  });

  it("opens without React warning that a component cannot be given a ref", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithApp(<OnboardingDialog open onOpenChange={() => {}} />);

    const messages = errors.mock.calls.map((call) => String(call[0]));
    errors.mockRestore();
    expect(messages.filter((m) => m.includes("cannot be given refs"))).toEqual([]);
  });
});
