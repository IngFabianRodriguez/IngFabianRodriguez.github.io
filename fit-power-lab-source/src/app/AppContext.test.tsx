import { act, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  AppProvider,
  useActiveRide,
  useAnalysis,
  useAppActions,
  useAppState,
} from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { makeLoadedRide, steadyRecords } from "@/test/fixtures";

const weights = { riderKg: 75, bikeKg: 5 };

function wrapper(initial = {}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AppProvider initial={initial}>{children}</AppProvider>;
  };
}

describe("AppContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("adds a ride, makes it active and returns its id", () => {
    const { result } = renderHook(() => ({ actions: useAppActions(), state: useAppState() }), {
      wrapper: wrapper(),
    });
    const { id: _id, loadedAt: _at, ...input } = makeLoadedRide();

    let id = "";
    act(() => {
      id = result.current.actions.addRide(input);
    });

    expect(id).not.toBe("");
    expect(result.current.state.rides).toHaveLength(1);
    expect(result.current.state.activeId).toBe(id);
  });

  it("gives no analysis until weights are confirmed", () => {
    const ride = makeLoadedRide();
    const { result } = renderHook(() => useAnalysis(), {
      wrapper: wrapper({ rides: [ride], activeId: ride.id }),
    });
    expect(result.current).toBeNull();
  });

  it("computes the watts of the active ride from the weights", () => {
    const ride = makeLoadedRide(steadyRecords(30));
    const { result } = renderHook(() => useAnalysis(), {
      wrapper: wrapper({ weights, rides: [ride], activeId: ride.id }),
    });
    expect(result.current?.watts).toHaveLength(30);
    expect(result.current?.watts[15]).toBe(56);
  });

  it("recomputes the watts when the model changes", () => {
    const ride = makeLoadedRide(steadyRecords(30));
    const { result } = renderHook(() => ({ analysis: useAnalysis(), actions: useAppActions() }), {
      wrapper: wrapper({ weights, rides: [ride], activeId: ride.id }),
    });
    const before = result.current.analysis?.watts[15] ?? 0;

    act(() => result.current.actions.setModel({ cdA: 0.8 }));

    expect(result.current.analysis?.watts[15]).toBeGreaterThan(before);
  });

  it("finds the active ride", () => {
    const ride = makeLoadedRide(steadyRecords(5), "a.fit");
    const { result } = renderHook(() => useActiveRide(), {
      wrapper: wrapper({ rides: [ride], activeId: ride.id }),
    });
    expect(result.current?.fileName).toBe("a.fit");
  });

  it("translates with the chosen language", () => {
    function Probe() {
      const { t } = useI18n();
      return <p>{t("app.tab.overview")}</p>;
    }
    render(
      <AppProvider initial={{ locale: "es" }}>
        <Probe />
      </AppProvider>,
    );
    expect(screen.getByText("Resumen")).toBeInTheDocument();
  });

  it("sets the language of the page", () => {
    render(<AppProvider initial={{ locale: "es" }}>{null}</AppProvider>);
    expect(document.documentElement.lang).toBe("es");
  });

  it("applies the dark theme to the page", () => {
    render(<AppProvider initial={{ theme: "dark" }}>{null}</AppProvider>);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("remembers the preferences when it owns persistence, and not when given an initial state", () => {
    const { rerender } = render(<AppProvider>{null}</AppProvider>);
    expect(localStorage.getItem("fit-power-web.settings")).not.toBeNull();

    localStorage.clear();
    rerender(<AppProvider initial={{ units: "imperial" }}>{null}</AppProvider>);
    expect(localStorage.getItem("fit-power-web.settings")).toBeNull();
  });
});
