import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(cleanup);

// jsdom has no layout and no ResizeObserver. Recharts' responsive container waits for a size
// from it, so this stub reports a fixed one the moment something is observed.
class ResizeObserverStub {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    const contentRect = { width: 800, height: 192 } as DOMRectReadOnly;
    this.callback([{ target, contentRect } as ResizeObserverEntry], this);
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// `expect(await axe(container)).toHaveNoViolations()` in component tests.
expect.extend(axeMatchers);
