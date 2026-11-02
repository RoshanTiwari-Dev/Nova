import { CodeRunner, ExecutionRequest, ExecutionResult } from "./types";

export class PistonRunner implements CodeRunner {
  private apiUrl: string;

  constructor(apiUrl = "https://emkc.org/api/v2/piston") {
    this.apiUrl = apiUrl.replace(/\/$/, "");
  }

  async submit(request: ExecutionRequest): Promise<{ token: string }> {
    const res = await this.runSync(request);
    const token = `piston-${Date.now()}`;
    PistonRunner.cache.set(token, res);
    return { token };
  }

  async getResult(token: string): Promise<ExecutionResult> {
    const cached = PistonRunner.cache.get(token);
    if (cached) return cached;

    return {
      token,
      status: "runtime_error",
      statusDescription: "Piston job not found",
      stdout: null,
      stderr: "Result expired or unavailable",
      compileOutput: null,
      exitCode: 1,
      timeMs: null,
      memoryKb: null,
      language: "python",
    };
  }

  private static cache = new Map<string, ExecutionResult>();

  async runSync(request: ExecutionRequest): Promise<ExecutionResult> {
    const langMap: Record<string, { language: string; version: string }> = {
      cpp: { language: "c++", version: "10.2.0" },
      java: { language: "java", version: "15.0.2" },
      python: { language: "python", version: "3.10.0" },
      javascript: { language: "javascript", version: "18.15.0" },
      typescript: { language: "typescript", version: "5.0.3" },
      go: { language: "go", version: "1.16.2" },
      rust: { language: "rust", version: "1.68.2" },
    };

    const target = langMap[request.language] || { language: "python", version: "3.10.0" };

    try {
      const resp = await fetch(`${this.apiUrl}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: target.language,
          version: target.version,
          files: [{ content: request.code }],
          stdin: request.stdin || "",
        }),
      });

      if (!resp.ok) {
        throw new Error(`Piston execute failed HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const run = data.run || {};

      return {
        status: run.code === 0 ? "accepted" : "runtime_error",
        statusDescription: run.code === 0 ? "Accepted" : "Runtime Error",
        stdout: run.stdout || null,
        stderr: run.stderr || null,
        compileOutput: data.compile?.output || null,
        exitCode: run.code ?? 0,
        timeMs: 100,
        memoryKb: null,
        language: request.language,
        runtimeVersion: `${data.language} ${data.version}`,
      };
    } catch (err: any) {
      return {
        status: "runtime_error",
        statusDescription: "Piston execution error",
        stdout: null,
        stderr: err?.message || "Failed to reach Piston runner",
        compileOutput: null,
        exitCode: 1,
        timeMs: 0,
        memoryKb: 0,
        language: request.language,
      };
    }
  }
}
