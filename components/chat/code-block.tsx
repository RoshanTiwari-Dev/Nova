"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Play, ExternalLink, Loader2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SupportedLanguage } from "@/lib/runner/types";

interface CodeBlockProps {
  language: string;
  code: string;
}

export function CodeBlock({ language, code }: CodeBlockProps) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);
  const [isRunning, setIsRunning] = React.useState(false);
  const [runResult, setRunResult] = React.useState<any>(null);

  const cleanLang = (language || "python").toLowerCase().trim();
  const isRunnable = ["cpp", "c++", "java", "python", "javascript", "typescript", "go", "rust"].includes(
    cleanLang
  );

  const normalizedLang: SupportedLanguage =
    cleanLang === "c++"
      ? "cpp"
      : (["cpp", "java", "python", "javascript", "typescript", "go", "rust"].includes(cleanLang)
          ? (cleanLang as SupportedLanguage)
          : "python");

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInEditor = () => {
    // Store in localStorage for instant editor loading
    try {
      localStorage.setItem(
        "nova_editor_import",
        JSON.stringify({
          language: normalizedLang,
          code,
          timestamp: Date.now(),
        })
      );
    } catch {
      // ignore
    }
    router.push(`/ide?import=true&lang=${normalizedLang}`);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setRunResult(null);
    try {
      const submitRes = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: normalizedLang,
          code,
          stdin: "",
        }),
      });

      if (!submitRes.ok) {
        const err = await submitRes.json();
        throw new Error(err.error?.message || "Execution submission failed");
      }

      const { token } = await submitRes.json();

      // Poll for result
      let attempts = 0;
      const poll = async (): Promise<any> => {
        attempts++;
        const pollRes = await fetch(`/api/run/${token}`);
        if (!pollRes.ok) throw new Error("Failed to poll execution result");
        const pollData = await pollRes.json();
        const res = pollData.result;

        if (res.status === "queue" || res.status === "processing") {
          if (attempts > 12) throw new Error("Execution timed out");
          await new Promise((r) => setTimeout(r, 800));
          return poll();
        }
        return res;
      };

      const finalResult = await poll();
      setRunResult(finalResult);
      if (finalResult.status === "accepted") {
        toast.success("Execution completed successfully");
      } else {
        toast.error(`Execution: ${finalResult.statusDescription}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute code");
      setRunResult({
        status: "runtime_error",
        statusDescription: err?.message || "Error running code",
        stderr: err?.message,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="relative my-4 rounded-xl border border-border bg-[#0d1117] text-slate-100 overflow-hidden shadow-lg group">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-[#161b22] text-xs">
        <span className="font-mono font-medium text-slate-300 uppercase tracking-wider text-[11px]">
          {language || "code"}
        </span>
        <div className="flex items-center space-x-1.5">
          {isRunnable && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRun}
                disabled={isRunning}
                className="h-7 px-2.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                title="Run code in sandbox"
              >
                {isRunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Play className="h-3.5 w-3.5 mr-1 fill-emerald-400" />
                )}
                <span>Run</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleOpenInEditor}
                className="h-7 px-2.5 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                title="Open in full IDE editor"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                <span>Open in editor</span>
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-7 px-2.5 text-xs text-slate-300 hover:text-white hover:bg-white/10"
            title="Copy code"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 mr-1" />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </Button>
        </div>
      </div>

      {/* Code body */}
      <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed">
        <pre className="!bg-transparent !p-0 !m-0">
          <code>{code}</code>
        </pre>
      </div>

      {/* Inline Execution Output */}
      {runResult && (
        <div className="border-t border-border/40 bg-[#090d13] p-3 text-xs font-mono">
          <div className="flex items-center justify-between text-muted-foreground pb-2 mb-2 border-b border-white/5">
            <div className="flex items-center space-x-1.5">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-slate-200">Execution Result</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px]">
              <span
                className={
                  runResult.status === "accepted" ? "text-emerald-400" : "text-rose-400 font-semibold"
                }
              >
                {runResult.statusDescription || runResult.status}
              </span>
              {runResult.timeMs !== null && <span>• {runResult.timeMs}ms</span>}
            </div>
          </div>
          {runResult.stdout && (
            <div className="text-slate-200 whitespace-pre-wrap">{runResult.stdout}</div>
          )}
          {(runResult.stderr || runResult.compileOutput) && (
            <div className="text-rose-400 whitespace-pre-wrap mt-1">
              {runResult.stderr || runResult.compileOutput}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
