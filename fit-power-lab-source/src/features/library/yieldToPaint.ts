/**
 * Lets the browser draw what React just rendered before the next stretch of heavy work. An
 * animation frame is the right moment, but a hidden tab never runs one, so a timer is the
 * fallback and loading keeps going in the background.
 */
export function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      resolve();
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => setTimeout(finish, 0));
    }
    setTimeout(finish, 50);
  });
}
