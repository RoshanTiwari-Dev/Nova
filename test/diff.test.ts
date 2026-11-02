import { describe, it, expect } from "vitest";
import { computeLineDiff, generateUnifiedPatch } from "../lib/utils";

describe("Diff Application and Patch Generation", () => {
  it("should accurately detect unchanged, added, and removed lines", () => {
    const oldCode = "line 1\nline 2\nline 3";
    const newCode = "line 1\nline 2 (modified)\nline 3\nline 4 (added)";

    const diff = computeLineDiff(oldCode, newCode);
    expect(diff.length).toBeGreaterThan(1);

    const hasAddition = diff.some((p) => p.added);
    const hasRemoval = diff.some((p) => p.removed);

    expect(hasAddition).toBe(true);
    expect(hasRemoval).toBe(true);
  });

  it("should generate standard unified patch format", () => {
    const patch = generateUnifiedPatch(
      "main.py",
      "print('hello')\n",
      "print('hello world')\n"
    );

    expect(patch).toContain("--- a/main.py");
    expect(patch).toContain("+++ b/main.py");
    expect(patch).toContain("-print('hello')");
    expect(patch).toContain("+print('hello world')");
  });
});
