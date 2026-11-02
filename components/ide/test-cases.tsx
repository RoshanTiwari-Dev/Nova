"use client";

import * as React from "react";
import { Plus, Trash2, Play, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SupportedLanguage } from "@/lib/runner/types";
import { toast } from "sonner";

export interface TestCase {
  id: string;
  stdin: string;
  expectedOutput: string;
  actualOutput?: string;
  status?: "passed" | "failed" | "error" | "running" | "untested";
  timeMs?: number;
}

interface TestCasesProps {
  language: SupportedLanguage;
  code: string;
}

export function TestCasesPanel({ language, code }: TestCasesProps) {
  const [testCases, setTestCases] = React.useState<TestCase[]>([
    {
      id: "tc-1",
      stdin: "Alice",
      expectedOutput: "Welcome, Alice!",
      status: "untested",
    },
    {
      id: "tc-2",
      stdin: "World",
      expectedOutput: "Welcome, World!",
      status: "untested",
    },
  ]);

  const [isRunningAll, setIsRunningAll] = React.useState(false);

  const addTestCase = () => {
    const newId = `tc-${Date.now()}`;
    setTestCases((prev) => [
      ...prev,
      {
        id: newId,
        stdin: "",
        expectedOutput: "",
        status: "untested",
      },
    ]);
  };

  const removeTestCase = (id: string) => {
    setTestCases((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTestCase = (id: string, field: "stdin" | "expectedOutput", value: string) => {
    setTestCases((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value, status: "untested" } : t))
    );
  };

  const runSingleTest = async (testCase: TestCase): Promise<TestCase> => {
    try {
      const submitRes = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          code,
          stdin: testCase.stdin,
        }),
      });

      if (!submitRes.ok) {
        return { ...testCase, status: "error", actualOutput: "Execution submission failed" };
      }

      const { token } = await submitRes.json();

      let attempts = 0;
      const poll = async (): Promise<any> => {
        attempts++;
        const pollRes = await fetch(`/api/run/${token}`);
        if (!pollRes.ok) throw new Error("Poll failed");
        const pollData = await pollRes.json();
        const res = pollData.result;
        if (res.status === "queue" || res.status === "processing") {
          if (attempts > 12) throw new Error("Timeout");
          await new Promise((r) => setTimeout(r, 600));
          return poll();
        }
        return res;
      };

      const result = await poll();
      const actual = (result.stdout || "").trim();
      const expected = testCase.expectedOutput.trim();

      const passed = expected.length > 0 && actual.includes(expected);

      return {
        ...testCase,
        status: passed ? "passed" : "failed",
        actualOutput: actual || result.stderr || "No output",
        timeMs: result.timeMs,
      };
    } catch (err: any) {
      return {
        ...testCase,
        status: "error",
        actualOutput: err?.message || "Execution error",
      };
    }
  };

  const runAllTests = async () => {
    if (testCases.length === 0) return;
    setIsRunningAll(true);

    try {
      const updated = await Promise.all(
        testCases.map((tc) => {
          // Set running state
          setTestCases((prev) =>
            prev.map((t) => (t.id === tc.id ? { ...t, status: "running" } : t))
          );
          return runSingleTest(tc);
        })
      );
      setTestCases(updated);
      const passedCount = updated.filter((t) => t.status === "passed").length;
      toast.info(`Test run complete: ${passedCount}/${updated.length} passed`);
    } catch {
      toast.error("Error executing test cases");
    } finally {
      setIsRunningAll(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3 p-3">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Custom Test Cases ({testCases.length})
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={addTestCase} className="h-7 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Test
          </Button>
          <Button
            size="sm"
            onClick={runAllTests}
            disabled={isRunningAll}
            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {isRunningAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1 fill-current" />
            )}
            Run All Tests
          </Button>
        </div>
      </div>

      {/* Test cases list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {testCases.map((tc, index) => (
          <div
            key={tc.id}
            className="rounded-lg border border-border bg-card/60 p-3 space-y-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-foreground">Case {index + 1}</span>
                {tc.status === "passed" && (
                  <Badge variant="success" className="h-5 text-[10px] space-x-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Passed</span>
                  </Badge>
                )}
                {tc.status === "failed" && (
                  <Badge variant="destructive" className="h-5 text-[10px] space-x-1">
                    <XCircle className="h-3 w-3" />
                    <span>Failed</span>
                  </Badge>
                )}
                {tc.status === "error" && (
                  <Badge variant="warning" className="h-5 text-[10px] space-x-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Error</span>
                  </Badge>
                )}
                {tc.status === "running" && (
                  <Badge variant="outline" className="h-5 text-[10px] space-x-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Running</span>
                  </Badge>
                )}
              </div>
              <button
                onClick={() => removeTestCase(tc.id)}
                className="text-muted-foreground hover:text-destructive p-1"
                title="Delete test case"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Stdin (Input)
                </label>
                <textarea
                  value={tc.stdin}
                  onChange={(e) => updateTestCase(tc.id, "stdin", e.target.value)}
                  placeholder="Input arguments..."
                  rows={2}
                  className="w-full font-mono text-xs rounded-md border border-input bg-background/50 p-1.5 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Expected Output
                </label>
                <textarea
                  value={tc.expectedOutput}
                  onChange={(e) => updateTestCase(tc.id, "expectedOutput", e.target.value)}
                  placeholder="Expected string..."
                  rows={2}
                  className="w-full font-mono text-xs rounded-md border border-input bg-background/50 p-1.5 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </div>

            {tc.actualOutput !== undefined && (
              <div className="mt-2 pt-2 border-t border-border/40">
                <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Actual Output {tc.timeMs ? `(${tc.timeMs}ms)` : ""}:
                </span>
                <pre className="font-mono text-xs p-2 rounded bg-[#0d1117] text-slate-200 overflow-x-auto whitespace-pre-wrap">
                  {tc.actualOutput}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
