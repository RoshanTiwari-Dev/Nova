import { describe, it, expect } from "vitest";
import { Judge0Runner } from "../lib/runner/judge0";

describe("Judge0 Runner Adapter & Emulation", () => {
  it("should generate a submission token on submit", async () => {
    const runner = new Judge0Runner();
    const res = await runner.submit({
      language: "python",
      code: "print('Hello NOVA!')",
    });

    expect(res).toBeDefined();
    expect(res.token).toBeDefined();
    expect(typeof res.token).toBe("string");
  });

  it("should resolve valid execution result for token", async () => {
    const runner = new Judge0Runner();
    const submission = await runner.submit({
      language: "python",
      code: "print('Test runner')",
    });

    const result = await runner.getResult(submission.token);
    expect(result).toBeDefined();
    expect(result.status).toBeDefined();
    expect(["accepted", "queue", "processing"]).toContain(result.status);
  });
});
