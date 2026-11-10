/** A 2D context that remembers every call and every property that was set, in order. */
export function canvasRecorder() {
  const calls: [string, ...unknown[]][] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_target, name) =>
      name === "canvas" ? undefined : (...args: unknown[]) => calls.push([String(name), ...args]),
    set: (_target, name, value) => {
      calls.push([`set ${String(name)}`, value]);
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}
