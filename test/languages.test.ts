import { describe, it, expect } from "vitest";
import { LANGUAGES, getLanguageConfig, getAllLanguages } from "../lib/runner/languages";

describe("Languages Table Specification", () => {
  it("should support C++, Java, and Python as MVP languages", () => {
    expect(LANGUAGES.cpp).toBeDefined();
    expect(LANGUAGES.java).toBeDefined();
    expect(LANGUAGES.python).toBeDefined();
  });

  it("should have correct Judge0 IDs for C++, Java, and Python", () => {
    expect(LANGUAGES.cpp.judge0Id).toBe(54); // GCC 9.2.0
    expect(LANGUAGES.java.judge0Id).toBe(62); // OpenJDK 13.0.1
    expect(LANGUAGES.python.judge0Id).toBe(71); // Python 3.8.1
  });

  it("should have correct file naming conventions", () => {
    expect(LANGUAGES.cpp.fileName).toBe("main.cpp");
    expect(LANGUAGES.java.fileName).toBe("Main.java");
    expect(LANGUAGES.python.fileName).toBe("main.py");
  });

  it("should provide non-empty starter templates for all supported languages", () => {
    const all = getAllLanguages();
    all.forEach((lang) => {
      expect(lang.starterTemplate).toBeDefined();
      expect(lang.starterTemplate.length).toBeGreaterThan(20);
    });
  });

  it("should fallback safely for unknown language queries", () => {
    const config = getLanguageConfig("unknown-lang");
    expect(config.id).toBe("python");
  });
});
