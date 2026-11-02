import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../lib/ai/prompts";

describe("Prompt Builder & Persona Constraints", () => {
  it("should contain NOVA branding and core identity", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("You are NOVA");
    expect(prompt).toContain("AI coding companion");
  });

  it("should adapt to different response styles", () => {
    const concise = buildSystemPrompt({ responseStyle: "concise" });
    expect(concise).toContain("Be extremely direct, clear, and punchy");

    const beginner = buildSystemPrompt({ responseStyle: "beginner" });
    expect(beginner).toContain("Explain concepts with friendly analogies");

    const advanced = buildSystemPrompt({ responseStyle: "advanced" });
    expect(advanced).toContain("Assume senior engineering competency");
  });

  it("should inject custom instructions into system prompt", () => {
    const custom = "Always format C++ using LLVM style and use smart pointers.";
    const prompt = buildSystemPrompt({ customInstructions: custom });
    expect(prompt).toContain(custom);
  });
});
