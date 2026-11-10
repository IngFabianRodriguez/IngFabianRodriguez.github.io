import { summarizePower } from "@/domain/analysis";
import { exportColumns } from "@/domain/exporters/columns";
import type { ModelSettings } from "@/domain/modelSettings";
import type { Ride } from "@/domain/ride";
import { elevationChange } from "@/domain/tools/climb";
import type { Weights } from "@/domain/weights";

export interface JsonOptions {
  fileName?: string;
  /** What the power was estimated with; null in the file when the caller does not know. */
  settings?: { weights: Weights; model: ModelSettings };
}

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

/**
 * The analysis as JSON, in SI units: where it came from, the settings used for the power
 * estimate, a summary, and every series as an array with one value per sample (`null` where the
 * sample has none). The series stay on one line each so the file is readable and not huge.
 */
export function toJson(ride: Ride, watts: number[], options: JsonOptions = {}): string {
  const columns = exportColumns(ride, watts);
  const power = summarizePower(watts);
  const { ascent, descent } = elevationChange(columns.altitudeM);
  const first = columns.distanceM[0] ?? 0;
  const last = columns.distanceM.at(-1) ?? 0;

  const document = {
    format: "fit-power-lab/analysis",
    version: 1,
    source: {
      fileName: options.fileName ?? null,
      startTime: ride.startTime.toISOString(),
    },
    settings: options.settings
      ? { weights: options.settings.weights, model: options.settings.model }
      : null,
    summary: {
      samples: ride.samples.length,
      elapsedS: columns.elapsedS.at(-1) ?? 0,
      distanceM: round(last - first, 2),
      ascentM: round(ascent, 1),
      descentM: round(descent, 1),
      maxSpeedMs: columns.speedMs.reduce((a, b) => Math.max(a, b), 0),
      hasPosition: columns.latitudeDeg.some((v) => v !== null),
      power: {
        averagePedallingW: power.averagePedalling,
        maxW: power.max,
        pedallingShare: round(power.pedallingShare, 4),
        averageW:
          watts.length === 0 ? 0 : round(watts.reduce((a, b) => a + b, 0) / watts.length, 1),
      },
    },
  };

  const head = JSON.stringify(document, null, 2).slice(0, -2);
  const seriesLines = Object.entries(columns)
    .map(([key, values]) => `    ${JSON.stringify(key)}: ${JSON.stringify(values)}`)
    .join(",\n");
  return `${head},\n  "series": {\n${seriesLines}\n  }\n}\n`;
}
