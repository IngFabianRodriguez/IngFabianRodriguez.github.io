// @vitest-environment node
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ overrideConfigFile: "eslint.config.js" });

async function restrictedMessages(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).filter((m) => m.ruleId === "no-restricted-syntax");
}

describe("strict shadcn/ui usage", () => {
  it.each(["button", "input", "select", "textarea", "label", "table"])(
    "rejects a native <%s> outside src/components/ui",
    async (tag) => {
      const messages = await restrictedMessages(
        `export const A = () => <${tag} />;`,
        `src/features/A.tsx`,
      );
      expect(messages).toHaveLength(1);
      expect(messages[0]?.message).toContain("shadcn/ui");
      expect(messages[0]?.message).toContain(`<${tag}>`);
    },
  );

  it("allows native elements inside src/components/ui (where shadcn generates them)", async () => {
    const messages = await restrictedMessages(
      `export const B = () => <button type="button" />;`,
      `src/components/ui/button.tsx`,
    );
    expect(messages).toHaveLength(0);
  });

  it("allows shadcn components and non-interactive native elements elsewhere", async () => {
    const messages = await restrictedMessages(
      `import { Button } from "@/components/ui/button";
export const C = () => (
  <main>
    <Button>Load file</Button>
  </main>
);`,
      `src/features/C.tsx`,
    );
    expect(messages).toHaveLength(0);
  });
});
