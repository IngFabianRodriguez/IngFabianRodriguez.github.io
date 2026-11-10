import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Page, TestInfo } from "@playwright/test";

const AXE_SOURCE = join(process.cwd(), "node_modules", "axe-core", "axe.min.js");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

export type Impact = "minor" | "moderate" | "serious" | "critical";

export interface Finding {
  rule: string;
  impact: Impact;
  help: string;
  /** A CSS selector of the failing element. */
  target: string;
  /** The text the element shows, shortened. */
  text: string;
}

interface AxeNode {
  target: unknown[];
  html: string;
}
interface AxeViolation {
  id: string;
  impact: Impact | null;
  help: string;
  nodes: AxeNode[];
}

/** Runs axe-core (WCAG 2.0/2.1 A and AA rules and the best practices) on the page as it is now and lists what fails. */
export async function runAxe(page: Page): Promise<Finding[]> {
  if (!(await page.evaluate(() => "axe" in window))) {
    await page.addScriptTag({ path: AXE_SOURCE });
  }
  return page.evaluate(async (tags) => {
    const axe = (
      window as unknown as {
        axe: { run: (c: Document, o: object) => Promise<{ violations: AxeViolation[] }> };
      }
    ).axe;
    const { violations } = await axe.run(document, { runOnly: { type: "tag", values: tags } });
    return violations.flatMap((violation) =>
      violation.nodes.map((node) => {
        const selector = String(node.target[node.target.length - 1] ?? "");
        let text = "";
        try {
          text = (document.querySelector(selector)?.textContent ?? "").trim();
        } catch {
          // A selector that querySelector cannot parse leaves the text empty.
        }
        return {
          rule: violation.id,
          impact: (violation.impact ?? "minor") as Impact,
          help: violation.help,
          target: selector,
          text: text.replace(/\s+/g, " ").slice(0, 80) || node.html.slice(0, 80),
        };
      }),
    );
  }, TAGS);
}

/** Keeps the findings with the test, so the report can be built from the run. */
export function attachFindings(testInfo: TestInfo, findings: Finding[]): void {
  const folder = testInfo.outputDir;
  mkdirSync(folder, { recursive: true });
  const path = join(folder, "a11y-findings.json");
  writeFileSync(path, JSON.stringify({ title: testInfo.title, findings }, null, 2));
  testInfo.attachments.push({ name: "a11y-findings", path, contentType: "application/json" });
}

export const isBlocking = (finding: Finding) =>
  finding.impact === "serious" || finding.impact === "critical";

export const describeFinding = (f: Finding) => `${f.impact} ${f.rule}: ${f.target} ("${f.text}")`;
