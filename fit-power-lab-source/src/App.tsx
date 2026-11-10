import { lazy, Suspense, useEffect, useState } from "react";
import {
  AppProvider,
  useActiveRide,
  useAnalysis,
  useAppActions,
  useAppState,
} from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import type { AppState } from "@/app/appState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Weights } from "@/domain/weights";
import { AnalysisSummary } from "@/features/analysis/AnalysisSummary";
import { FitFilePicker } from "@/features/analysis/FitFilePicker";
import { ExportButton } from "@/features/export/ExportButton";
import { LoadSampleButton } from "@/features/help/LoadSampleButton";
import { OnboardingDialog } from "@/features/help/OnboardingDialog";
import { ShortcutsDialog } from "@/features/help/ShortcutsDialog";
import { createShortcutBindings } from "@/features/help/shortcuts";
import { useKeyboardShortcuts } from "@/features/help/useKeyboardShortcuts";
import { useOnboarding } from "@/features/help/useOnboarding";
import { OfflineCard } from "@/features/offline/OfflineCard";
import { PrintReportButton } from "@/features/share/PrintReportButton";
import { FlyoverVideoButton } from "@/features/flyover/FlyoverVideoButton";
import { ShareCardButton } from "@/features/share/ShareCardButton";
import { WeightsForm } from "@/features/weights/WeightsForm";
import { getDefaultRideStore } from "@/lib/persistence/defaultStore";
import { restoreRides } from "@/lib/persistence/restoreRides";
import { useRidePersistence } from "@/lib/persistence/useRidePersistence";
import { formatWeight } from "@/lib/units";
import { loadWeights, saveWeights } from "@/lib/weightsStorage";

// The map, the charts and every section load only when they are shown, which keeps the first
// download small (Leaflet and Recharts are most of the code).
const RouteMap = lazy(() =>
  import("@/features/map/RouteMap").then((m) => ({ default: m.RouteMap })),
);
const RideCharts = lazy(() =>
  import("@/features/charts/RideCharts").then((m) => ({ default: m.RideCharts })),
);
const Route3D = lazy(() => import("@/features/map/Route3D").then((m) => ({ default: m.Route3D })));
const RoutesHeatMap = lazy(() =>
  import("@/features/map/RoutesHeatMap").then((m) => ({ default: m.RoutesHeatMap })),
);
const MetricsPanel = lazy(() =>
  import("@/features/metrics/MetricsPanel").then((m) => ({ default: m.MetricsPanel })),
);
const ModelPanel = lazy(() =>
  import("@/features/model/ModelPanel").then((m) => ({ default: m.ModelPanel })),
);
const LibraryPanel = lazy(() =>
  import("@/features/library/LibraryPanel").then((m) => ({ default: m.LibraryPanel })),
);
const ToolsPanel = lazy(() =>
  import("@/features/tools/ToolsPanel").then((m) => ({ default: m.ToolsPanel })),
);
const DevicePanel = lazy(() =>
  import("@/features/device/DevicePanel").then((m) => ({ default: m.DevicePanel })),
);
const SettingsPanel = lazy(() =>
  import("@/features/settings/SettingsPanel").then((m) => ({ default: m.SettingsPanel })),
);

type Section = "overview" | "metrics" | "model" | "library" | "tools" | "device" | "settings";

function Loading() {
  const { t } = useI18n();
  return <p className="text-muted-foreground text-sm">{t("app.loading")}</p>;
}

function Overview({ onSampleLoaded }: { onSampleLoaded: () => void }) {
  const { t } = useI18n();
  const { weights, model } = useAppState();
  const { addRide } = useAppActions();
  const active = useActiveRide();
  const analysis = useAnalysis();
  // The 3D view is a heavy canvas, so it is only drawn once the user asks for it.
  const [show3d, setShow3d] = useState(false);

  if (!weights) return null;
  return (
    <div className="grid gap-6">
      <FitFilePicker
        weights={weights}
        onAnalyzed={(analyzed, fileName, source) =>
          addRide({ fileName, source, fit: analyzed.fit, ride: analyzed.ride })
        }
      />
      {active && analysis ? (
        <>
          <AnalysisSummary fileName={active.fileName} analysis={analysis} />
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton
              analysis={analysis}
              fileName={active.fileName}
              settings={{ weights, model }}
            />
            <PrintReportButton analysis={analysis} fileName={active.fileName} />
            <ShareCardButton analysis={analysis} fileName={active.fileName} />
            <FlyoverVideoButton analysis={analysis} fileName={active.fileName} />
          </div>
          <Suspense fallback={<Loading />}>
            <RouteMap key={active.id} ride={analysis.ride} watts={analysis.watts} />
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="w-fit"
                aria-expanded={show3d}
                aria-controls="route-3d"
                onClick={() => setShow3d((open) => !open)}
              >
                {show3d ? t("app.hide3d") : t("app.show3d")}
              </Button>
              <div id="route-3d">
                {show3d ? <Route3D key={`3d-${active.id}`} ride={analysis.ride} /> : null}
              </div>
            </div>
            <RideCharts
              key={`charts-${active.id}`}
              ride={analysis.ride}
              watts={analysis.watts}
              fileBase={active.fileName.replace(/\.[^.]+$/, "")}
            />
          </Suspense>
        </>
      ) : (
        <LoadSampleButton onLoaded={onSampleLoaded} />
      )}
    </div>
  );
}

function Shell() {
  const { t } = useI18n();
  const { weights, units, theme } = useAppState();
  const { setWeights, setUnits, setTheme, addRide } = useAppActions();
  const [lastUsed, setLastUsed] = useState(loadWeights);
  const [section, setSection] = useState<Section>("overview");
  const onboarding = useOnboarding();

  // Rides are kept between visits: new ones are saved, and the saved ones come back on start.
  useRidePersistence();
  useEffect(() => {
    let alive = true;
    void restoreRides(getDefaultRideStore()).then((rides) => {
      if (alive) for (const ride of rides) addRide(ride);
    });
    return () => {
      alive = false;
    };
  }, [addRide]);

  const bindings = createShortcutBindings(
    {
      overview: () => setSection("overview"),
      metrics: () => setSection("metrics"),
      model: () => setSection("model"),
      library: () => setSection("library"),
      tools: () => setSection("tools"),
      device: () => setSection("device"),
      settings: () => setSection("settings"),
      units: () => setUnits(units === "metric" ? "imperial" : "metric"),
      theme: () => setTheme(theme === "dark" ? "light" : "dark"),
    },
    t,
  );
  useKeyboardShortcuts(bindings);

  function confirmWeights(confirmed: Weights) {
    saveWeights(confirmed);
    setLastUsed(confirmed);
    setWeights(confirmed);
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("app.title")}</h1>
        {weights ? (
          <div className="flex items-center gap-3">
            <p>
              {t("app.weightsSummary", {
                rider: formatWeight(weights.riderKg, units),
                bike: formatWeight(weights.bikeKg, units),
              })}
            </p>
            <Button variant="outline" onClick={() => setWeights(null)}>
              {t("app.changeWeights")}
            </Button>
          </div>
        ) : null}
      </header>

      {weights === null ? (
        <div className="grid gap-4">
          <WeightsForm initial={lastUsed} onSubmit={confirmWeights} />
          <div className="mx-auto">
            <LoadSampleButton />
          </div>
        </div>
      ) : (
        <Tabs
          value={section}
          onValueChange={(value) => setSection(value as Section)}
          className="gap-6"
        >
          <TabsList aria-label={t("app.tabs")} className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="overview">{t("app.tab.overview")}</TabsTrigger>
            <TabsTrigger value="metrics">{t("app.tab.metrics")}</TabsTrigger>
            <TabsTrigger value="model">{t("app.tab.model")}</TabsTrigger>
            <TabsTrigger value="library">{t("app.tab.library")}</TabsTrigger>
            <TabsTrigger value="tools">{t("app.tab.tools")}</TabsTrigger>
            <TabsTrigger value="device">{t("app.tab.device")}</TabsTrigger>
            <TabsTrigger value="settings">{t("app.tab.settings")}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <Overview onSampleLoaded={() => setSection("overview")} />
          </TabsContent>
          <Suspense fallback={<Loading />}>
            <TabsContent value="metrics">
              <MetricsPanel />
            </TabsContent>
            <TabsContent value="model">
              <ModelPanel />
            </TabsContent>
            <TabsContent value="library">
              <div className="grid gap-6">
                <LibraryPanel />
                <RoutesHeatMap />
              </div>
            </TabsContent>
            <TabsContent value="tools">
              <ToolsPanel />
            </TabsContent>
            <TabsContent value="device">
              <DevicePanel />
            </TabsContent>
            <TabsContent value="settings">
              <div className="grid gap-6">
                <SettingsPanel />
                <OfflineCard />
              </div>
            </TabsContent>
          </Suspense>
        </Tabs>
      )}

      <ShortcutsDialog bindings={bindings} />
      <OnboardingDialog open={onboarding.open} onOpenChange={onboarding.setOpen} />
    </main>
  );
}

/** `initial` replaces the saved preferences (tests); leave it out in the real app. */
export function App({ initial }: { initial?: Partial<AppState> }) {
  return (
    <AppProvider {...(initial ? { initial } : {})}>
      <Shell />
    </AppProvider>
  );
}
