import { parseWeights, type Weights } from "@/domain/weights";

const KEY = "fit-power-web.weights";

/** Last confirmed weights, or null when none were saved or the stored value is not usable. */
export function loadWeights(): Weights | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return null;
    const { riderKg, bikeKg } = data as Record<string, unknown>;
    if (typeof riderKg !== "number" || typeof bikeKg !== "number") return null;
    const parsed = parseWeights(String(riderKg), String(bikeKg));
    return parsed.ok ? parsed.weights : null;
  } catch {
    return null;
  }
}

export function saveWeights(weights: Weights): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(weights));
  } catch {
    // Storage can be unavailable (private mode, quota); the weights are then just not remembered.
  }
}
