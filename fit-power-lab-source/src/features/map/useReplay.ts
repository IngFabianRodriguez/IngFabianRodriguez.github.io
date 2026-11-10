import { useEffect, useRef, useState } from "react";
import type { Ride } from "@/domain/ride";
import { kmAtSeconds, secondsAtKm } from "@/domain/viz/axis";

export const REPLAY_SPEEDS = [10, 60, 300, 1000];
const TICK_MS = 100;

interface ReplayOptions {
  ride: Ride;
  /** Part of the route that may be shown, in km from the start of the recording; null for none. */
  span: [number, number] | null;
  /** Where the shared cursor is now. */
  cursorKm: number | null;
  /** Moves the shared cursor, which is how the map marker and the charts follow the replay. */
  onKm: (km: number) => void;
}

/**
 * Plays the ride back: every 100 ms the clock moves `speed` times faster than the ride was
 * ridden and the shared cursor follows it, until the end of the visible route. Pressing play
 * resumes from the cursor when it is inside the route, and from the start otherwise.
 */
export function useReplay({ ride, span, cursorKm, onKm }: ReplayOptions) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(REPLAY_SPEEDS[1] ?? 60);
  const clock = useRef(0);

  useEffect(() => {
    if (!playing || !span) return;
    const [, endKm] = span;
    const id = setInterval(() => {
      clock.current += (TICK_MS / 1000) * speed;
      const km = kmAtSeconds(ride, clock.current);
      if (km >= endKm) {
        onKm(endKm);
        setPlaying(false);
      } else {
        onKm(km);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [playing, speed, span, ride, onKm]);

  function toggle() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (!span) return;
    const [startKm, endKm] = span;
    const resume = cursorKm !== null && cursorKm >= startKm && cursorKm < endKm;
    clock.current = secondsAtKm(ride, resume ? cursorKm : startKm);
    if (!resume) onKm(startKm);
    setPlaying(true);
  }

  return { playing, speed, setSpeed, toggle };
}
