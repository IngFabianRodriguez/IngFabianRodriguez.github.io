import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { I18nProvider } from "@/app/I18nContext";
import { installFakeServiceWorker } from "@/features/offline/fakeServiceWorker";
import { OfflineCard } from "@/features/offline/OfflineCard";
import { messages } from "@/features/offline/messages";

// The parent adds this area's file to the registry; until then the card's keys are added here.
vi.mock("@/app/messages", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/app/messages")>();
  const { mergeMessages } = await import("@/app/i18n");
  const own = await import("@/features/offline/messages");
  return { ...original, MESSAGES: mergeMessages(original.MESSAGES, own.messages) };
});

let fake: ReturnType<typeof installFakeServiceWorker> | null = null;

function stubStorage(usage: number, quota: number) {
  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value: { estimate: vi.fn(async () => ({ usage, quota })) },
  });
}

interface InstallEvent extends Event {
  prompt: ReturnType<typeof vi.fn>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function installPromptEvent(outcome: "accepted" | "dismissed"): InstallEvent {
  const event = new Event("beforeinstallprompt", { cancelable: true }) as InstallEvent;
  event.prompt = vi.fn(async () => {});
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

beforeEach(() => {
  stubStorage(5 * 1024 * 1024, 2 * 1024 * 1024 * 1024);
});

afterEach(() => {
  fake?.restore();
  fake = null;
  Reflect.deleteProperty(navigator, "storage");
});

describe("OfflineCard", () => {
  it("says the app is ready and shows the saved tiles and the storage used", async () => {
    fake = installFakeServiceWorker({ state: { shell: 1, assets: 5, tiles: 42 } });

    render(<OfflineCard />);

    expect(await screen.findByText("Ready for offline use")).toBeInTheDocument();
    expect(screen.getByText("42 of 1500")).toBeInTheDocument();
    expect(await screen.findByText("5 MB of 2 GB")).toBeInTheDocument();
  });

  it("asks the worker to prepare the files when they are not saved yet", async () => {
    fake = installFakeServiceWorker({ state: { shell: 0, assets: 0, tiles: 0 } });

    render(<OfflineCard />);

    expect(await screen.findByText("Ready for offline use")).toBeInTheDocument();
    expect(fake.received).toEqual([{ type: "cache-stats" }, { type: "precache" }]);
  });

  it("says offline use is not active when there is no worker and offers nothing to clear", async () => {
    render(<OfflineCard />);

    expect(await screen.findByText("Not active")).toBeInTheDocument();
    expect(screen.getByText(/needs the installed or production version/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear saved maps" })).toBeDisabled();
  });

  it("says so when the browser does not report storage", async () => {
    Reflect.deleteProperty(navigator, "storage");
    fake = installFakeServiceWorker();

    render(<OfflineCard />);

    expect(await screen.findByText("Not reported by this browser")).toBeInTheDocument();
  });

  it("clears the saved maps and announces how many were removed", async () => {
    fake = installFakeServiceWorker({ state: { tiles: 42 } });
    const user = userEvent.setup();
    render(<OfflineCard />);
    await screen.findByText("42 of 1500");

    await user.click(screen.getByRole("button", { name: "Clear saved maps" }));

    expect(await screen.findByText("Saved maps cleared: 42 tiles removed.")).toBeInTheDocument();
    expect(screen.getByText("0 of 1500")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear saved maps" })).toBeDisabled();
    expect(fake.received).toContainEqual({ type: "clear-tiles" });
  });

  it("keeps the install button off until the browser offers the installation", async () => {
    fake = installFakeServiceWorker();
    render(<OfflineCard />);
    await screen.findByText("Ready for offline use");

    expect(screen.getByRole("button", { name: "Install app" })).toBeDisabled();
    expect(screen.getByText(/Installing is not offered right now/)).toBeInTheDocument();
  });

  it("installs through the browser's own prompt", async () => {
    fake = installFakeServiceWorker();
    const user = userEvent.setup();
    render(<OfflineCard />);
    await screen.findByText("Ready for offline use");
    const event = installPromptEvent("accepted");

    act(() => {
      window.dispatchEvent(event);
    });
    await user.click(screen.getByRole("button", { name: "Install app" }));

    expect(event.defaultPrevented).toBe(true);
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("The app was installed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Install app" })).toBeDisabled();
  });

  it("lets the user try again after dismissing the installation", async () => {
    fake = installFakeServiceWorker();
    const user = userEvent.setup();
    render(<OfflineCard />);
    await screen.findByText("Ready for offline use");

    act(() => {
      window.dispatchEvent(installPromptEvent("dismissed"));
    });
    await user.click(screen.getByRole("button", { name: "Install app" }));

    expect(await screen.findByText("Installation was dismissed. You can try again.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Install app" })).toBeDisabled();
    act(() => {
      window.dispatchEvent(installPromptEvent("dismissed"));
    });
    expect(screen.getByRole("button", { name: "Install app" })).toBeEnabled();
  });

  it("notes that the app is installed when the browser says so", async () => {
    fake = installFakeServiceWorker();
    render(<OfflineCard />);
    await screen.findByText("Ready for offline use");

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(await screen.findByText("The app is installed on this device.")).toBeInTheDocument();
  });

  it("refreshes the counts when a new worker takes control", async () => {
    fake = installFakeServiceWorker({ state: { tiles: 1 } });
    render(<OfflineCard />);
    await screen.findByText("1 of 1500");

    fake.state.tiles = 3;
    act(() => fake?.emit("controllerchange"));

    await waitFor(() => expect(screen.getByText("3 of 1500")).toBeInTheDocument());
  });

  it("speaks Spanish when the app does", async () => {
    fake = installFakeServiceWorker({ state: { tiles: 4 } });

    render(
      <I18nProvider locale="es">
        <OfflineCard />
      </I18nProvider>,
    );

    expect(await screen.findByText("Lista para usarse sin conexión")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Borrar mapas guardados" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Instalar aplicación" })).toBeDisabled();
    expect(screen.getByText("4 de 1500")).toBeInTheDocument();
  });

  it("has no automatically detectable accessibility violations", async () => {
    fake = installFakeServiceWorker();
    const { container } = render(<OfflineCard />);
    await screen.findByText("Ready for offline use");

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("offline messages", () => {
  it("defines every key in English and Spanish, prefixed with offline., with the same placeholders", () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

    expect(Object.keys(messages.es).sort()).toEqual(Object.keys(messages.en).sort());
    for (const [key, english] of Object.entries(messages.en)) {
      expect(key.startsWith("offline.")).toBe(true);
      expect(placeholders(messages.es[key] ?? "")).toEqual(placeholders(english));
    }
  });
});
