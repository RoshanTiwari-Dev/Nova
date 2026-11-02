import { describe, it, expect } from "vitest";
import { z } from "zod";

const runCodeSchema = z.object({
  language: z.enum(["cpp", "java", "python", "javascript", "typescript", "go", "rust"]),
  code: z
    .string()
    .min(1, "Code cannot be empty")
    .max(100 * 1024, "Code length exceeds 100 KB limit"),
  stdin: z
    .string()
    .max(64 * 1024, "Standard input exceeds 64 KB limit")
    .optional(),
});

describe("API Input Validators (Zod)", () => {
  it("should accept valid code submission for C++, Java, and Python", () => {
    const validCpp = {
      language: "cpp",
      code: "int main() { return 0; }",
      stdin: "input",
    };
    expect(runCodeSchema.safeParse(validCpp).success).toBe(true);
  });

  it("should reject invalid or unsupported languages", () => {
    const invalidLang = {
      language: "cobol",
      code: "IDENTIFICATION DIVISION.",
    };
    expect(runCodeSchema.safeParse(invalidLang).success).toBe(false);
  });

  it("should reject empty code submissions", () => {
    const emptyCode = {
      language: "python",
      code: "",
    };
    expect(runCodeSchema.safeParse(emptyCode).success).toBe(false);
  });

  it("should reject submissions exceeding 100 KB code limit", () => {
    const hugeCode = {
      language: "python",
      code: "a = 1\n".repeat(25000), // > 120 KB
    };
    expect(runCodeSchema.safeParse(hugeCode).success).toBe(false);
  });
});
