import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import { App } from "@/App";

describe("accessibility", () => {
  it("has no automatically detectable violations on the first screen", async () => {
    const { container } = render(<App initial={{}} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
