"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Play,
  ExternalLink,
  Loader2,
  Terminal,
  ChevronDown,
  Columns2,
  Keyboard,
  Clock,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SupportedLanguage } from "@/lib/runner/types";
import { formatBytes, formatMs } from "@/lib/utils";

interface CodeBlockProps {
  language: string;
  code: string;
}

const SUPPORTED_LANGS: Array<{ id: SupportedLanguage; label: string }> = [
  { id: "python", label: "Python 3" },
  { id: "cpp", label: "C++ (GCC)" },
  { id: "java", label: "Java (OpenJDK)" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
];

export function CodeBlock({ language, code }: CodeBlockProps) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);
  const [isRunning, setIsRunning] = React.useState(false);
  const [runResult, setRunResult] = React.useState<any>(null);
  const [customStdin, setCustomStdin] = React.useState("");
  const [showStdinInput, setShowStdinInput] = React.useState(false);

  const cleanLang = (language || "python").toLowerCase().trim();
  const initialLang: SupportedLanguage =
    cleanLang === "c++"
      ? "cpp"
      : (["cpp", "java", "python", "javascript", "typescript", "go", "rust"].includes(cleanLang)
          ? (cleanLang as SupportedLanguage)
          : "python");

  const [selectedLang, setSelectedLang] = React.useState<SupportedLanguage>(initialLang);

  const isRunnable = ["cpp", "c++", "java", "python", "javascript", "typescript", "go", "rust"].includes(
    cleanLang
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenSideRunner = () => {
    // Dispatch custom event to open the side-by-side runner in the chat view
    window.dispatchEvent(
      new CustomEvent("nova:open-runner", {
        detail: {
          language: selectedLang,
          code,
        },
      })
    );
  };

  const handleOpenInIdePage = () => {
    try {
      localStorage.setItem(
        "nova_editor_import",
        JSON.stringify({
          language: selectedLang,
          code,
          timestamp: Date.now(),
        })
      );
    } catch {
      // ignore
    }
    router.push(`/ide?import=true&lang=${selectedLang}`);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setRunResult(null);
    try {
      const submitRes = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLang,
          code,
          stdin: customStdin,
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
        toast.success(`Ran in ${selectedLang} successfully`);
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
    <div className="relative my-4 rounded-xl border border-border/80 bg-[#0d1117] text-slate-100 overflow-hidden shadow-lg group">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-border/40 bg-[#161b22] text-xs gap-2">
        <div className="flex items-center space-x-2">
          {/* Language Selector Pill */}
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value as SupportedLanguage)}
            className="h-6 rounded bg-[#21262d] border border-white/10 px-2 py-0 text-[11px] font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-[#30363d] transition-colors"
          >
            {SUPPORTED_LANGS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            {code.split("\n").length} lines
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5">
          {isRunnable && (
            <>
              {/* Stdin Toggle Button */}
              <button
                type="button"
                onClick={() => setShowStdinInput(!showStdinInput)}
                className={`h-7 px-2 rounded-md text-[11px] transition-colors flex items-center space-x-1 ${
                  showStdinInput || customStdin
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
                title="Supply custom stdin inputs"
              >
                <Keyboard className="h-3 w-3" />
                <span className="hidden sm:inline">Input</span>
              </button>

              {/* Side-by-side Runner button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleOpenSideRunner}
                className="h-7 px-2 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                title="Open side-by-side interactive playground"
              >
                <Columns2 className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Side Runner</span>
              </Button>

              {/* Run Button */}
              <Button
                size="sm"
                onClick={handleRun}
                disabled={isRunning}
                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm transition-all hover:scale-[1.02]"
                title={`Run this program in ${selectedLang}`}
              >
                {isRunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Play className="h-3.5 w-3.5 mr-1 fill-current" />
                )}
                <span>Run</span>
              </Button>
            </>
          )}

          {/* Copy Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-7 px-2 text-xs text-slate-300 hover:text-white hover:bg-white/10"
            title="Copy code"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 mr-1" />
            )}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </Button>

          {/* Open in full IDE */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleOpenInIdePage}
            className="h-7 px-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/10"
            title="Open in full IDE page"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Expandable Stdin Input Bar */}
      {showStdinInput && (
        <div className="px-3 py-2 bg-[#12161f] border-b border-border/40 flex items-center space-x-2">
          <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
            Stdin Input:
          </span>
          <input
            type="text"
            value={customStdin}
            onChange={(e) => setCustomStdin(e.target.value)}
            placeholder="Type input passed to program..."
            className="flex-1 bg-[#1a202c] border border-white/10 rounded px-2 py-1 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      {/* Code Body */}
      <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed">
        <pre className="!bg-transparent !p-0 !m-0">
          <code>{code}</code>
        </pre>
      </div>

      {/* Inline Execution Output Console */}
      {runResult && (
        <div className="border-t border-border/40 bg-[#090d13] p-3 text-xs font-mono animate-in fade-in-0 duration-150">
          <div className="flex items-center justify-between text-muted-foreground pb-2 mb-2 border-b border-white/5">
            <div className="flex items-center space-x-1.5">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-slate-200">Execution Output</span>
              <Badge
                variant={runResult.status === "accepted" ? "success" : "destructive"}
                className="text-[10px] h-4 py-0"
              >
                {runResult.status === "accepted" ? "Exit 0" : runResult.statusDescription}
              </Badge>
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-slate-400">
              {runResult.timeMs !== null && (
                <span className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatMs(runResult.timeMs)}</span>
                </span>
              )}
              {runResult.memoryKb !== null && (
                <span className="flex items-center space-x-1">
                  <HardDrive className="h-3 w-3" />
                  <span>{formatBytes(runResult.memoryKb * 1024)}</span>
                </span>
              )}
            </div>
          </div>

          {runResult.stdout && (
            <div className="text-slate-200 whitespace-pre-wrap selection:bg-primary/30">
              {runResult.stdout}
            </div>
          )}

          {(runResult.stderr || runResult.compileOutput) && (
            <div className="text-rose-400 whitespace-pre-wrap mt-1">
              {runResult.stderr || runResult.compileOutput}
            </div>
          )}

          {!runResult.stdout && !runResult.stderr && !runResult.compileOutput && (
            <div className="text-slate-500 italic">Program executed with empty output.</div>
          )}
        </div>
      )}
    </div>
  );
}
