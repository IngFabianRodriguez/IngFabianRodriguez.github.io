import { ChevronDownIcon, VideoIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import type { Analysis } from "@/domain/analysis";
import {
  Mp4EncodingUnsupportedError,
  NoRouteError,
  WebGlUnavailableError,
} from "@/features/flyover/errors";
import type { Orientation } from "@/features/flyover/hud";
import { flyoverSupport, type FlyoverSupport } from "@/features/flyover/support";
import { safeFileName } from "@/features/share/imageExport";
import { rideTitle } from "@/features/share/summary";
import { downloadFile } from "@/lib/download";
import { terrainConfig, tileConfig } from "@/lib/tiles";

interface FlyoverVideoButtonProps {
  analysis: Pick<Analysis, "ride" | "watts">;
  fileName: string;
}

type Phase = { kind: "idle" } | { kind: "working"; stage: "tiles" | "video"; percent: number };

type Problem = "failed" | "noRoute" | "webgl" | "encoder";

const PROBLEM_TEXT: Record<Problem, string> = {
  failed: "flyover.failed",
  noRoute: "flyover.noRoute",
  webgl: "flyover.unsupported.webgl",
  encoder: "flyover.unsupported.encoder",
};

function problemOf(error: unknown): Problem | null {
  if (error instanceof DOMException && error.name === "AbortError") return null;
  if (error instanceof NoRouteError) return "noRoute";
  if (error instanceof WebGlUnavailableError) return "webgl";
  if (error instanceof Mp4EncodingUnsupportedError) return "encoder";
  return "failed";
}

/**
 * Makes a one-minute 3D flight over the whole route — the rider in the middle, the relief of the
 * terrain, the readings on top — and downloads it as an MP4: vertical for phones, horizontal from
 * the menu. It is made on this computer; the only requests are for the map and terrain tiles from
 * the servers chosen in Settings, and none for a kind of tile switched off there. The meters hidden
 * by the map privacy settings are not drawn and do not choose the area asked for, but the tiles are
 * asked for in blocks around what is shown, so a short hidden distance can still include the start.
 */
export function FlyoverVideoButton({ analysis, fileName }: FlyoverVideoButtonProps) {
  const { t, locale } = useI18n();
  const { units, mapPrivacy, terrainPrivacy } = useAppState();
  const hintId = useId();
  const [support, setSupport] = useState<FlyoverSupport>("ok");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [problem, setProblem] = useState<Problem | null>(null);
  const running = useRef<AbortController | null>(null);

  useEffect(() => {
    let current = true;
    void flyoverSupport().then((result) => {
      if (current) setSupport(result);
    });
    return () => {
      current = false;
    };
  }, []);
  // Leaving the page cancels a video in progress.
  useEffect(() => () => running.current?.abort(), []);

  async function start(orientation: Orientation) {
    const abort = new AbortController();
    running.current = abort;
    setProblem(null);
    setPhase({ kind: "working", stage: "tiles", percent: 0 });
    const title = rideTitle(fileName);
    try {
      // Loaded now, not with the page: the 3D drawing and the encoder are most of the weight.
      const { makeFlyoverVideo } = await import("@/features/flyover/makeFlyoverVideo");
      const video = await makeFlyoverVideo({
        ride: analysis.ride,
        watts: analysis.watts,
        orientation,
        units,
        t,
        title,
        dateText: new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
          analysis.ride.startTime,
        ),
        hideEndsM: mapPrivacy.hideEndsM,
        tiles: tileConfig(mapPrivacy),
        terrain: terrainConfig(terrainPrivacy),
        signal: abort.signal,
        onProgress: (stage, progress) => {
          const percent = Math.round(progress * 100);
          setPhase((now) =>
            now.kind === "working" && now.stage === stage && now.percent === percent
              ? now
              : { kind: "working", stage, percent },
          );
        },
      });
      downloadFile(video, `${safeFileName(title)}-3d-${orientation}.mp4`);
    } catch (cause) {
      setProblem(problemOf(cause));
    } finally {
      running.current = null;
      setPhase({ kind: "idle" });
    }
  }

  const working = phase.kind === "working";
  const unavailable = support !== "ok";
  const blocked = working || unavailable;
  const shownProblem: Problem | null =
    problem ?? (support === "no-webgl" ? "webgl" : support === "no-encoder" ? "encoder" : null);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          disabled={blocked}
          aria-describedby={hintId}
          onClick={() => void start("vertical")}
        >
          <VideoIcon aria-hidden="true" />
          {t("flyover.button")}
        </Button>
        <DropdownMenu>
          {/* No `asChild`: the shadcn Button does not forward refs under React 18. */}
          <DropdownMenuTrigger
            disabled={blocked}
            aria-label={t("flyover.more")}
            className={buttonVariants({ variant: "outline", size: "icon" })}
          >
            <ChevronDownIcon aria-hidden="true" />
          </DropdownMenuTrigger>
          {/* Above the Leaflet map, whose panes and controls reach z-index 1000. */}
          <DropdownMenuContent align="start" style={{ zIndex: 1100 }}>
            <DropdownMenuItem onSelect={() => void start("horizontal")}>
              {t("flyover.horizontal")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {working ? (
          <Button variant="ghost" onClick={() => running.current?.abort()}>
            {t("flyover.cancel")}
          </Button>
        ) : null}
      </div>
      <p id={hintId} className="text-muted-foreground max-w-prose text-sm">
        {t("flyover.hint")}
      </p>
      {phase.kind === "working" ? (
        <div role="status" className="grid max-w-md gap-1">
          <Progress
            value={phase.percent}
            aria-valuenow={phase.percent}
            aria-label={t("flyover.progress")}
          />
          <p className="text-muted-foreground text-sm">
            {t(`flyover.stage.${phase.stage}`, { percent: phase.percent })}
          </p>
        </div>
      ) : null}
      {shownProblem ? (
        <p
          role={problem ? "alert" : undefined}
          className={problem ? "text-destructive text-sm" : "text-muted-foreground text-sm"}
        >
          {t(PROBLEM_TEXT[shownProblem])}
        </p>
      ) : null}
    </div>
  );
}
