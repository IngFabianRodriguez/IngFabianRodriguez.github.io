import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { I18nProvider } from "@/app/I18nContext";
import {
  appReducer,
  initialAppState,
  type AppAction,
  type AppState,
  type KmRange,
  type MapPrivacy,
  type LoadedRide,
  type Theme,
  type XAxis,
} from "@/app/appState";
import type { Locale } from "@/app/i18n";
import { analyzeLoaded, type Analysis } from "@/domain/analysis";
import type { ModelSettings } from "@/domain/modelSettings";
import type { SeriesKey } from "@/domain/series";
import type { Weights } from "@/domain/weights";
import { loadSettings, saveSettings } from "@/lib/settingsStorage";
import type { UnitSystem } from "@/lib/units";

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: ReactNode;
  /**
   * Starting state. When given, the app does not read or save preferences in localStorage, which
   * is what tests want; leave it out in the real app.
   */
  initial?: Partial<AppState>;
}

function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function AppProvider({ children, initial }: AppProviderProps) {
  const persist = initial === undefined;
  const [state, dispatch] = useReducer(appReducer, undefined, () =>
    initialAppState(initial ?? loadSettings()),
  );

  useEffect(() => {
    applyTheme(state.theme);
  }, [state.theme]);

  useEffect(() => {
    document.documentElement.lang = state.locale;
  }, [state.locale]);

  useEffect(() => {
    if (!persist) return;
    saveSettings({
      units: state.units,
      locale: state.locale,
      theme: state.theme,
      model: state.model,
      mapPrivacy: state.mapPrivacy,
    });
  }, [persist, state.units, state.locale, state.theme, state.model, state.mapPrivacy]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <AppContext.Provider value={value}>
      <I18nProvider locale={state.locale}>{children}</I18nProvider>
    </AppContext.Provider>
  );
}

function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppState and useAppActions need an <AppProvider>");
  return context;
}

export function useAppState(): AppState {
  return useAppContext().state;
}

/** The app state, or null when the component is rendered outside an `<AppProvider>`. */
export function useAppStateOptional(): AppState | null {
  return useContext(AppContext)?.state ?? null;
}

/** The unit system in use; metric when rendered outside an `<AppProvider>`. */
export function useUnits(): UnitSystem {
  return useAppStateOptional()?.units ?? "metric";
}

/** What a caller gives to add a ride; the id and the load time are made here. */
export type NewRide = Omit<LoadedRide, "id" | "loadedAt"> & { id?: string };

export interface AppActions {
  setWeights(weights: Weights | null): void;
  setModel(patch: Partial<ModelSettings>): void;
  resetModel(): void;
  setUnits(units: UnitSystem): void;
  setLocale(locale: Locale): void;
  setTheme(theme: Theme): void;
  /** Adds a ride, makes it the active one and returns its id. */
  addRide(ride: NewRide): string;
  removeRide(id: string): void;
  selectRide(id: string | null): void;
  setCompare(id: string | null): void;
  setCursorKm(km: number | null): void;
  setRange(range: KmRange | null): void;
  setMapVariable(variable: SeriesKey): void;
  setXAxis(axis: XAxis): void;
  setMapPrivacy(patch: Partial<MapPrivacy>): void;
}

let counter = 0;
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ride-${Date.now()}-${++counter}`;

/** Stable functions that change the app state. */
export function useAppActions(): AppActions {
  const { dispatch } = useAppContext();
  return useMemo<AppActions>(
    () => ({
      setWeights: (weights) => dispatch({ type: "setWeights", weights }),
      setModel: (patch) => dispatch({ type: "setModel", patch }),
      resetModel: () => dispatch({ type: "resetModel" }),
      setUnits: (units) => dispatch({ type: "setUnits", units }),
      setLocale: (locale) => dispatch({ type: "setLocale", locale }),
      setTheme: (theme) => dispatch({ type: "setTheme", theme }),
      addRide: (ride) => {
        const id = ride.id ?? newId();
        dispatch({ type: "addRide", ride: { ...ride, id, loadedAt: Date.now() } });
        return id;
      },
      removeRide: (id) => dispatch({ type: "removeRide", id }),
      selectRide: (id) => dispatch({ type: "selectRide", id }),
      setCompare: (id) => dispatch({ type: "setCompare", id }),
      setCursorKm: (km) => dispatch({ type: "setCursorKm", km }),
      setRange: (range) => dispatch({ type: "setRange", range }),
      setMapVariable: (variable) => dispatch({ type: "setMapVariable", variable }),
      setXAxis: (axis) => dispatch({ type: "setXAxis", axis }),
      setMapPrivacy: (patch) => dispatch({ type: "setMapPrivacy", patch }),
    }),
    [dispatch],
  );
}

export function useActiveRide(): LoadedRide | null {
  const { rides, activeId } = useAppState();
  return rides.find((r) => r.id === activeId) ?? null;
}

/**
 * The ride (the active one unless `id` is given) with its watts, estimated for the confirmed
 * weights and the current model. Null until weights are confirmed or when there is no such ride.
 */
export function useAnalysis(id?: string): Analysis | null {
  const { rides, activeId, weights, model } = useAppState();
  const target = rides.find((r) => r.id === (id ?? activeId));
  return useMemo(
    () => (target && weights ? analyzeLoaded(target, weights, model) : null),
    [target, weights, model],
  );
}

/** Every loaded ride with its analysis, for features that look across rides. */
export function useAnalyses(): { loaded: LoadedRide; analysis: Analysis }[] {
  const { rides, weights, model } = useAppState();
  return useMemo(
    () =>
      weights
        ? rides.map((loaded) => ({ loaded, analysis: analyzeLoaded(loaded, weights, model) }))
        : [],
    [rides, weights, model],
  );
}
