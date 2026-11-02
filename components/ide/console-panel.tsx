"use client";

import * as React from "react";
import {
  Terminal,
  AlertTriangle,
  Wrench,
  HelpCircle,
  Clock,
  HardDrive,
  CheckCircle,
  XCircle,
  Copy,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ExecutionResult } from "@/lib/runner/types";
import { formatBytes, formatMs } from "@/lib/utils";
import { toast } from "sonner";

interface ConsolePanelProps {
  stdin: string;
  onStdinChange: (val: string) => void;
  result: ExecutionResult | null;
  isRunning: boolean;
  onExplainError?: () => void;
  onFixWithNova?: () => void;
  onClearOutput: () => void;
}

export function ConsolePanel({
  stdin,
  onStdinChange,
  result,
  isRunning,
  onExplainError,
  onFixWithNova,
  onClearOutput,
}: ConsolePanelProps) {
  const [tab, setTab] = React.useState<"output" | "stdin">("output");

  const isError =
    result &&
    result.status !== "accepted" &&
    result.status !== "queue" &&
    result.status !== "processing";

  const handleCopyOutput = () => {
    const text = [result?.stdout, result?.stderr, result?.compileOutput]
      .filter(Boolean)
      .join("\n");
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Output copied to clipboard");
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-slate-200 border-t lg:border-t-0 lg:border-l border-border select-text">
      {/* Console Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-[#161b22]">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-auto">
          <TabsList className="h-7 bg-muted/30 p-0.5">
            <TabsTrigger value="output" className="text-xs px-2.5 h-6">
              <Terminal className="h-3 w-3 mr-1" />
              Output Console
            </TabsTrigger>
            <TabsTrigger value="stdin" className="text-xs px-2.5 h-6">
              Stdin (Input)
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5">
          {result && (
            <Button
              size="iconSm"
              variant="ghost"
              onClick={handleCopyOutput}
              className="text-slate-400 hover:text-white"
              title="Copy output"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="iconSm"
            variant="ghost"
            onClick={onClearOutput}
            className="text-slate-400 hover:text-white"
            title="Clear output"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      {result && result.status !== "queue" && (
        <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-[#12161f] border-b border-border/40 text-[11px] font-mono">
          <div className="flex items-center space-x-2">
            {result.status === "accepted" ? (
              <Badge variant="success" className="h-5 text-[10px] space-x-1">
                <CheckCircle className="h-3 w-3" />
                <span>Accepted (Exit {result.exitCode ?? 0})</span>
              </Badge>
            ) : (
              <Badge variant="destructive" className="h-5 text-[10px] space-x-1">
                <XCircle className="h-3 w-3" />
                <span>{result.statusDescription || result.status}</span>
              </Badge>
            )}
            {result.runtimeVersion && (
              <span className="text-slate-400 hidden sm:inline">
                {result.runtimeVersion}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3 text-slate-400">
            {result.timeMs !== null && (
              <span className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{formatMs(result.timeMs)}</span>
              </span>
            )}
            {result.memoryKb !== null && (
              <span className="flex items-center space-x-1">
                <HardDrive className="h-3 w-3" />
                <span>{formatBytes(result.memoryKb * 1024)}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* AI Error Integration Bar on failed runs */}
      {isError && (
        <div className="flex items-center justify-between px-3 py-2 bg-rose-950/30 border-b border-rose-500/20 text-xs">
          <div className="flex items-center space-x-1.5 text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span className="font-medium">Execution failed</span>
          </div>
          <div className="flex items-center space-x-2">
            {onExplainError && (
              <Button
                size="sm"
                variant="outline"
                onClick={onExplainError}
                className="h-7 text-xs border-rose-500/30 hover:bg-rose-500/10 text-rose-200"
              >
                <HelpCircle className="h-3.5 w-3.5 mr-1" />
                <span>Explain Error</span>
              </Button>
            )}
            {onFixWithNova && (
              <Button
                size="sm"
                onClick={onFixWithNova}
                className="h-7 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium"
              >
                <Wrench className="h-3.5 w-3.5 mr-1" />
                <span>Fix with NOVA</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Console View Area */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
        {tab === "stdin" ? (
          <div className="h-full flex flex-col space-y-2">
            <label className="text-[11px] text-slate-400 block">
              Custom standard input (stdin) passed to your program on execution:
            </label>
            <textarea
              value={stdin}
              onChange={(e) => onStdinChange(e.target.value)}
              placeholder="Enter custom stdin here..."
              className="flex-1 w-full bg-[#161b22] border border-border/40 rounded-lg p-3 text-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        ) : (
          <div className="space-y-3 whitespace-pre-wrap">
            {isRunning && (
              <div className="flex items-center space-x-2 text-primary animate-pulse">
                <span>Running program in sandbox container...</span>
              </div>
            )}

            {!isRunning && !result && (
              <div className="text-slate-500 italic py-6 text-center">
                Click &quot;Run&quot; or press Ctrl/Cmd+Enter to compile and run your code.
              </div>
            )}

            {result?.compileOutput && (
              <div className="p-2.5 rounded bg-rose-950/20 border border-rose-500/30 text-rose-300">
                <span className="font-semibold block mb-1">Compiler Diagnostic:</span>
                {result.compileOutput}
              </div>
            )}

            {result?.stdout && (
              <div className="text-slate-200">
                {result.stdout}
              </div>
            )}

            {result?.stderr && (
              <div className="text-rose-400">
                {result.stderr}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
