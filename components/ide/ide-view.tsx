"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Play,
  RotateCcw,
  Download,
  Share2,
  Save,
  Maximize2,
  Minimize2,
  Wrench,
  HelpCircle,
  Zap,
  Sparkles,
  ShieldAlert,
  Loader2,
  Undo2,
  TestTube2,
  Code2,
} from "lucide-react";
import { MonacoWrapper } from "./monaco-wrapper";
import { ConsolePanel } from "./console-panel";
import { DiffModal } from "./diff-modal";
import { TestCasesPanel } from "./test-cases";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { LANGUAGES, getLanguageConfig, SupportedLanguage } from "@/lib/runner/languages";
import { ExecutionResult } from "@/lib/runner/types";
import { toast } from "sonner";

interface IdeViewProps {
  projectId?: string;
  initialCode?: string;
  initialLanguage?: SupportedLanguage;
}

export function IdeView({
  projectId,
  initialCode,
  initialLanguage = "python",
}: IdeViewProps) {
  const searchParams = useSearchParams();
  const [language, setLanguage] = React.useState<SupportedLanguage>(initialLanguage);
  const [code, setCode] = React.useState<string>(
    initialCode || LANGUAGES[initialLanguage].starterTemplate
  );
  const [historyCode, setHistoryCode] = React.useState<string[]>([]);
  const [stdin, setStdin] = React.useState("");

  const [isRunning, setIsRunning] = React.useState(false);
  const [executionResult, setExecutionResult] = React.useState<ExecutionResult | null>(null);

  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const [activeBottomTab, setActiveBottomTab] = React.useState<"console" | "tests">("console");

  // AI Diff & Actions state
  const [diffModalOpen, setDiffModalOpen] = React.useState(false);
  const [diffData, setDiffData] = React.useState<{
    summary: string;
    proposedCode: string;
    fileName: string;
  }>({ summary: "", proposedCode: "", fileName: "" });

  const [aiTextModalOpen, setAiTextModalOpen] = React.useState(false);
  const [aiTextData, setAiTextData] = React.useState<{ title: string; content: string }>({
    title: "",
    content: "",
  });
  const [isAiLoading, setIsAiLoading] = React.useState(false);

  const editorRef = React.useRef<any>(null);

  // Check for code imported from Chat "Open in Editor"
  React.useEffect(() => {
    const importFlag = searchParams.get("import");
    const langFlag = searchParams.get("lang") as SupportedLanguage | null;

    if (importFlag === "true") {
      try {
        const stored = localStorage.getItem("nova_editor_import");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.code) {
            setCode(parsed.code);
            if (parsed.language && LANGUAGES[parsed.language as SupportedLanguage]) {
              setLanguage(parsed.language as SupportedLanguage);
            }
            toast.info("Imported code snippet into editor");
            localStorage.removeItem("nova_editor_import");
          }
        }
      } catch {
        // ignore
      }
    } else if (langFlag && LANGUAGES[langFlag]) {
      setLanguage(langFlag);
      setCode(LANGUAGES[langFlag].starterTemplate);
    }
  }, [searchParams]);

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    setCode(LANGUAGES[newLang].starterTemplate);
    setExecutionResult(null);
  };

  const handleResetCode = () => {
    if (confirm("Reset editor to default starter template?")) {
      setHistoryCode((prev) => [...prev, code]);
      setCode(LANGUAGES[language].starterTemplate);
      setExecutionResult(null);
      toast.info("Code reset to starter template");
    }
  };

  const handleUndo = () => {
    if (historyCode.length === 0) return;
    const prev = historyCode[historyCode.length - 1];
    setHistoryCode((h) => h.slice(0, h.length - 1));
    setCode(prev);
    toast.success("Changes undone");
  };

  // Keyboard shortcut Ctrl/Cmd+Enter to run
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunCode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [code, language, stdin, isRunning]);

  const handleRunCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveBottomTab("console");
    setExecutionResult({
      status: "queue",
      statusDescription: "Queued in runner sandbox...",
      stdout: null,
      stderr: null,
      compileOutput: null,
      exitCode: null,
      timeMs: null,
      memoryKb: null,
      language,
    });

    try {
      const submitRes = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          code,
          stdin,
        }),
      });

      if (!submitRes.ok) {
        const errJson = await submitRes.json();
        throw new Error(errJson.error?.message || "Execution submission failed");
      }

      const { token } = await submitRes.json();

      // Poll for execution result
      let attempts = 0;
      const poll = async (): Promise<ExecutionResult> => {
        attempts++;
        const pollRes = await fetch(`/api/run/${token}`);
        if (!pollRes.ok) throw new Error("Failed to poll execution result");
        const pollData = await pollRes.json();
        const res = pollData.result;

        if (res.status === "queue" || res.status === "processing") {
          if (attempts > 15) throw new Error("Sandbox execution timed out after 15s");
          await new Promise((resolve) => setTimeout(resolve, 800));
          return poll();
        }

        return res;
      };

      const finalRes = await poll();
      setExecutionResult(finalRes);

      if (finalRes.status === "accepted") {
        toast.success("Execution completed successfully");
      } else {
        toast.error(`Execution: ${finalRes.statusDescription}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Error running code");
      setExecutionResult({
        status: "runtime_error",
        statusDescription: err?.message || "Execution failed",
        stdout: null,
        stderr: err?.message || "Network error while reaching sandbox",
        compileOutput: null,
        exitCode: 1,
        timeMs: 0,
        memoryKb: 0,
        language,
      });
    } finally {
      setIsRunning(false);
    }
  };

  // AI Fix with NOVA (produces diff modal)
  const handleFixWithNova = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch("/api/ai/code-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fix",
          language,
          code,
          errorOutput: executionResult?.stderr || executionResult?.compileOutput || "Error during execution",
          stdin,
        }),
      });

      if (!res.ok) throw new Error("AI fix generation failed");
      const data = await res.json();

      if (data.isDiff && data.updatedFiles?.[0]?.content) {
        setDiffData({
          summary: data.summary,
          proposedCode: data.updatedFiles[0].content,
          fileName: LANGUAGES[language].fileName,
        });
        setDiffModalOpen(true);
      } else {
        toast.info(data.text || "Fix suggested");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate fix");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Generic AI Code Action
  const triggerAiAction = async (action: "explain" | "optimize" | "complexity" | "generate_tests") => {
    setIsAiLoading(true);
    try {
      const res = await fetch("/api/ai/code-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          language,
          code,
          errorOutput: executionResult?.stderr,
          stdin,
        }),
      });

      if (!res.ok) throw new Error("AI action failed");
      const data = await res.json();

      if (data.isDiff && data.updatedFiles?.[0]?.content) {
        setDiffData({
          summary: data.summary,
          proposedCode: data.updatedFiles[0].content,
          fileName: LANGUAGES[language].fileName,
        });
        setDiffModalOpen(true);
      } else {
        setAiTextData({
          title: `NOVA — ${action.toUpperCase().replace("_", " ")}`,
          content: data.text || "Analysis complete.",
        });
        setAiTextModalOpen(true);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to process AI action");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApproveDiff = (newCode: string) => {
    setHistoryCode((prev) => [...prev, code]);
    setCode(newCode);
    toast.success("Applied AI code modifications!");
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([code], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = LANGUAGES[language].fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success(`Downloaded ${LANGUAGES[language].fileName}`);
  };

  const handleSaveProject = async () => {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: projectId,
          title: `${LANGUAGES[language].name} Snippet`,
          language,
          files: [{ name: LANGUAGES[language].fileName, content: code }],
        }),
      });

      if (res.ok) {
        toast.success("Project saved successfully");
      }
    } catch {
      toast.error("Failed to save project");
    }
  };

  const handleShare = () => {
    const dummyShareUrl = `${window.location.origin}/ide?share=${Date.now()}`;
    navigator.clipboard.writeText(dummyShareUrl);
    toast.success("Read-only share link copied to clipboard");
  };

  return (
    <div
      className={`flex flex-col ${
        isFullScreen ? "fixed inset-0 z-50 bg-background" : "h-[calc(100vh-3.5rem)] lg:h-screen"
      }`}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-border bg-card/60 gap-2">
        <div className="flex items-center space-x-2">
          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {Object.values(LANGUAGES).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          {/* Run Button */}
          <Button
            size="sm"
            onClick={handleRunCode}
            disabled={isRunning}
            className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-medium space-x-1.5 shadow-sm"
          >
            {isRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            <span>Run Code</span>
          </Button>

          {/* Undo */}
          {historyCode.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleUndo}
              className="h-8 text-xs"
              title="Undo last modification"
            >
              <Undo2 className="h-3.5 w-3.5 mr-1" />
              <span>Undo</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetCode}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            title="Reset code"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>

        {/* AI Actions Dropdown / Quick Buttons */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button
            size="sm"
            variant="subtle"
            disabled={isAiLoading}
            onClick={() => triggerAiAction("explain")}
            className="h-8 text-xs font-medium"
            title="Line by line explanation"
          >
            <HelpCircle className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Explain</span>
          </Button>

          <Button
            size="sm"
            variant="subtle"
            disabled={isAiLoading}
            onClick={() => triggerAiAction("optimize")}
            className="h-8 text-xs font-medium"
            title="Optimize performance and memory"
          >
            <Zap className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Optimize</span>
          </Button>

          <Button
            size="sm"
            variant="subtle"
            disabled={isAiLoading}
            onClick={() => triggerAiAction("complexity")}
            className="h-8 text-xs font-medium"
            title="Analyze asymptotic time & space complexity"
          >
            <Sparkles className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Complexity</span>
          </Button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          {/* Utility buttons */}
          <Button size="iconSm" variant="ghost" onClick={handleSaveProject} title="Save snippet">
            <Save className="h-4 w-4" />
          </Button>
          <Button size="iconSm" variant="ghost" onClick={handleDownload} title="Download source">
            <Download className="h-4 w-4" />
          </Button>
          <Button size="iconSm" variant="ghost" onClick={handleShare} title="Share link">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            size="iconSm"
            variant="ghost"
            onClick={() => setIsFullScreen(!isFullScreen)}
            title="Toggle fullscreen"
          >
            {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Security Warning Notice */}
      <div className="px-3 py-1 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Security Notice:</strong> Never put API keys, passwords, or sensitive secrets in
            submitted code.
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveBottomTab(activeBottomTab === "console" ? "tests" : "console")}
            className="font-semibold underline hover:opacity-80"
          >
            Switch to {activeBottomTab === "console" ? "Test Cases" : "Console"}
          </button>
        </div>
      </div>

      {/* Main Workspace (Editor + Output Split) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* Left: Monaco Editor */}
        <div className="h-[45vh] lg:h-full relative border-b lg:border-b-0 border-border">
          <MonacoWrapper
            language={LANGUAGES[language].monacoLanguage}
            value={code}
            onChange={(val) => setCode(val || "")}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
          />
        </div>

        {/* Right: Console & Test Cases */}
        <div className="h-[45vh] lg:h-full overflow-hidden flex flex-col">
          {activeBottomTab === "console" ? (
            <ConsolePanel
              stdin={stdin}
              onStdinChange={setStdin}
              result={executionResult}
              isRunning={isRunning}
              onExplainError={() => triggerAiAction("explain")}
              onFixWithNova={handleFixWithNova}
              onClearOutput={() => setExecutionResult(null)}
            />
          ) : (
            <div className="h-full bg-card overflow-hidden">
              <TestCasesPanel language={language} code={code} />
            </div>
          )}
        </div>
      </div>

      {/* AI Diff Review Modal */}
      <DiffModal
        open={diffModalOpen}
        onOpenChange={setDiffModalOpen}
        originalCode={code}
        proposedCode={diffData.proposedCode}
        summary={diffData.summary}
        fileName={diffData.fileName}
        onApprove={handleApproveDiff}
      />

      {/* AI Text Analysis Modal */}
      <Dialog open={aiTextModalOpen} onOpenChange={setAiTextModalOpen}>
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>{aiTextData.title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-[#0d1117] p-4 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
          {aiTextData.content}
        </div>
        <DialogFooter>
          <Button size="sm" onClick={() => setAiTextModalOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
