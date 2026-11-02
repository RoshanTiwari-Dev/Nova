"use client";

import * as React from "react";
import {
  Sparkles,
  Send,
  Square,
  Globe,
  Paperclip,
  Mic,
  MicOff,
  Code2,
  Terminal,
  Zap,
  BookOpen,
  ArrowRight,
  Loader2,
  FileText,
  X,
  Play,
  RotateCcw,
  Sliders,
  Columns2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { MessageItem } from "./message-item";
import { ModelSelector } from "./model-selector";
import { StyleSelector } from "./style-selector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MonacoWrapper } from "@/components/ide/monaco-wrapper";
import { LANGUAGES, getLanguageConfig, SupportedLanguage } from "@/lib/runner/languages";
import { ExecutionResult } from "@/lib/runner/types";
import { formatBytes, formatMs } from "@/lib/utils";
import { toast } from "sonner";
import { nanoid } from "nanoid";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string | Date;
}

interface ChatViewProps {
  conversationId: string;
  initialMessages?: Message[];
}

export function ChatView({
  conversationId,
  initialMessages = [],
}: ChatViewProps) {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [abortController, setAbortController] = React.useState<AbortController | null>(null);

  const [selectedModel, setSelectedModel] = React.useState("gpt-4o-mini");
  const [responseStyle, setResponseStyle] = React.useState<
    "concise" | "detailed" | "beginner" | "advanced"
  >("detailed");
  const [webSearchEnabled, setWebSearchEnabled] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [attachedFiles, setAttachedFiles] = React.useState<
    Array<{ name: string; content?: string }>
  >([]);

  // Side-by-side Runner state
  const [isSideRunnerOpen, setIsSideRunnerOpen] = React.useState(false);
  const [runnerLang, setRunnerLang] = React.useState<SupportedLanguage>("python");
  const [runnerCode, setRunnerCode] = React.useState<string>(LANGUAGES.python.starterTemplate);
  const [runnerStdin, setRunnerStdin] = React.useState("");
  const [isRunnerRunning, setIsRunnerRunning] = React.useState(false);
  const [runnerResult, setRunnerResult] = React.useState<ExecutionResult | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Listen for custom event from CodeBlock "Side Runner" button
  React.useEffect(() => {
    const handleOpenRunner = (e: any) => {
      if (e.detail?.code) {
        setRunnerCode(e.detail.code);
        if (e.detail.language && LANGUAGES[e.detail.language as SupportedLanguage]) {
          setRunnerLang(e.detail.language as SupportedLanguage);
        }
        setIsSideRunnerOpen(true);
        toast.info("Loaded code into Side-by-Side Runner");
      }
    };
    window.addEventListener("nova:open-runner", handleOpenRunner);
    return () => window.removeEventListener("nova:open-runner", handleOpenRunner);
  }, []);

  // Load conversation messages
  React.useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    } else {
      fetch(`/api/conversations/${conversationId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.messages) {
            const mapped = data.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content:
                typeof m.parts === "string"
                  ? m.parts
                  : m.parts?.[0]?.text || JSON.stringify(m.parts),
              createdAt: m.createdAt,
            }));
            setMessages(mapped);
          }
        })
        .catch(() => {});
    }
  }, [conversationId, initialMessages]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() && attachedFiles.length === 0) return;
    if (isLoading) return;

    let fullPrompt = textToSend;
    if (attachedFiles.length > 0) {
      fullPrompt +=
        "\n\n[Attached Reference Context]:\n" +
        attachedFiles
          .map((f) => `--- File: ${f.name} ---\n${f.content || "[File content attached]"}`)
          .join("\n\n");
    }

    const userMessage: Message = {
      id: nanoid(12),
      role: "user",
      content: fullPrompt,
      createdAt: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setAttachedFiles([]);
    setIsLoading(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel,
          webSearch: webSearchEnabled,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to stream chat response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      const assistantId = nanoid(12);

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", createdAt: new Date() },
      ]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("0:")) {
              try {
                const token = JSON.parse(line.slice(2));
                assistantText += token;
              } catch {
                assistantText += line.slice(2);
              }
            } else if (line.startsWith("3:")) {
              try {
                const errMsg = JSON.parse(line.slice(2));
                if (errMsg.includes("no credits remaining") || errMsg.includes("billing")) {
                  assistantText = `⚠️ **OpenAI Billing Notice:** Your OpenAI API account has no credits remaining ($0 balance).\n\nTo use OpenAI, add \$5 credit at [platform.openai.com/settings/organization/billing/](https://platform.openai.com/settings/organization/billing/).\n\n> [!TIP]\n> **Want it 100% free?** Get a free Google Gemini key from [aistudio.google.com](https://aistudio.google.com/) and add it to \`.env.local\` as \`GOOGLE_GENERATIVE_AI_API_KEY\`.`;
                } else {
                  assistantText = `⚠️ **AI Service Notice:** ${errMsg}`;
                }
              } catch {
                assistantText = `⚠️ **AI Service Notice:** ${line.slice(2)}`;
              }
            } else if (line.trim() && !line.startsWith("d:") && !line.startsWith("e:")) {
              assistantText += line;
            }
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, content: assistantText } : msg
            )
          );
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        toast.info("Generation stopped");
      } else {
        toast.error(err?.message || "Error generating response");
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(12),
            role: "assistant",
            content: `⚠️ **Error:** ${err?.message || "Failed to reach AI service."}`,
            createdAt: new Date(),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    if (messages.length < 2) return;
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx !== -1) {
      const actualIdx = messages.length - 1 - lastUserIdx;
      const userMsg = messages[actualIdx];
      setMessages(messages.slice(0, actualIdx));
      handleSend(userMsg.content);
    }
  };

  const handleToggleMic = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsRecording(true);
        toast.info("Listening...");
      };

      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInput((prev) => (prev ? prev + " " + transcript : transcript));
        setIsRecording(false);
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10 MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setAttachedFiles((prev) => [...prev, { name: file.name, content }]);
      toast.success(`Attached ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Run code inside Side Runner
  const handleExecuteSideRunner = async () => {
    setIsRunnerRunning(true);
    setRunnerResult(null);

    try {
      const submitRes = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: runnerLang,
          code: runnerCode,
          stdin: runnerStdin,
        }),
      });

      if (!submitRes.ok) {
        const err = await submitRes.json();
        throw new Error(err.error?.message || "Execution submission failed");
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
          if (attempts > 12) throw new Error("Execution timed out");
          await new Promise((r) => setTimeout(r, 800));
          return poll();
        }
        return res;
      };

      const finalRes = await poll();
      setRunnerResult(finalRes);
      if (finalRes.status === "accepted") {
        toast.success(`Executed ${runnerLang} program successfully`);
      } else {
        toast.error(`Execution: ${finalRes.statusDescription}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Execution failed");
      setRunnerResult({
        status: "runtime_error",
        statusDescription: err?.message || "Execution failed",
        stdout: null,
        stderr: err?.message,
        compileOutput: null,
        exitCode: 1,
        timeMs: 0,
        memoryKb: 0,
        language: runnerLang,
      });
    } finally {
      setIsRunnerRunning(false);
    }
  };

  const starterPrompts = [
    {
      title: "Write a program in Python",
      desc: "Interactive data analysis with clean output",
      prompt: "Write a clean Python script that parses a list of scores, calculates the median, mean, and standard deviation, and prints a formatted report.",
    },
    {
      title: "C++ High-Performance Algorithm",
      desc: "Fast sorting & memory benchmark",
      prompt: "Write a C++ program implementing QuickSort with custom median-of-three pivot and benchmark its execution time.",
    },
    {
      title: "Java Multi-Threaded Queue",
      desc: "Producer-Consumer pattern with threads",
      prompt: "Implement a thread-safe Producer-Consumer queue in Java with test execution in Main.java.",
    },
    {
      title: "Ask any general question",
      desc: "Chat freely about concepts, writing, math, or ideas",
      prompt: "Explain the intuitive difference between dynamic programming and divide & conquer with real-world analogies.",
    },
  ];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen bg-background relative overflow-hidden">
      {/* LEFT: ChatGPT Chat Interface */}
      <div className={`flex flex-col h-full transition-all duration-300 ${isSideRunnerOpen ? "w-full lg:w-1/2 border-r border-border" : "w-full"}`}>
        {/* ChatGPT Style Top Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/40 backdrop-blur-sm z-20">
          <div className="flex items-center space-x-2">
            <ModelSelector
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
            />
            <StyleSelector
              style={responseStyle}
              onChangeStyle={setResponseStyle}
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                webSearchEnabled
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
              title="Toggle Tavily web search"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
            </button>

            {/* Toggle Code Runner Button */}
            <Button
              size="sm"
              variant={isSideRunnerOpen ? "default" : "outline"}
              onClick={() => setIsSideRunnerOpen(!isSideRunnerOpen)}
              className="h-8 text-xs font-medium space-x-1.5 shadow-sm"
              title="Open or close side-by-side multi-language code runner"
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>{isSideRunnerOpen ? "Close Runner" : "Run Programs"}</span>
            </Button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 text-white shadow-xl shadow-primary/20">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  What can I help with today?
                </h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Chat naturally about any topic, write essays, solve equations, or write and run programs in C++, Java, and Python.
                </p>
              </div>

              {/* Starter Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
                {starterPrompts.map((starter, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(starter.prompt)}
                    className="group p-3.5 rounded-xl border border-border bg-card/60 hover:bg-card hover:border-primary/40 transition-all text-left shadow-sm hover:shadow"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                        {starter.title}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {starter.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-3">
              {messages.map((msg, index) => (
                <MessageItem
                  key={msg.id || index}
                  id={msg.id}
                  role={msg.role}
                  content={msg.content}
                  createdAt={msg.createdAt}
                  isLatest={index === messages.length - 1}
                  onRegenerate={handleRegenerate}
                  onEditAndResend={(newText) => handleSend(newText)}
                  onFollowUpClick={(suggestion) => handleSend(suggestion)}
                />
              ))}

              {isLoading && (
                <div className="flex items-center space-x-3 py-3 px-4 rounded-xl bg-card/40 border border-border/40 text-xs text-muted-foreground animate-pulse">
                  <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  </div>
                  <span>NOVA is thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ChatGPT Style Bottom Input Bar */}
        <div className="p-3 sm:p-4 border-t border-border bg-card/80 backdrop-blur-md">
          <div className="max-w-3xl mx-auto space-y-2">
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-1">
                {attachedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-muted text-xs border border-border"
                  >
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate max-w-[150px]">{f.name}</span>
                    <button
                      onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-foreground ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative flex items-end rounded-2xl border border-input bg-background/80 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-primary p-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask anything or request a program to run... (Enter to send)"
                rows={Math.min(input.split("\n").length || 1, 5)}
                className="flex-1 bg-transparent border-0 px-2.5 py-1 text-sm placeholder:text-muted-foreground focus:outline-none resize-none max-h-36"
              />

              <div className="flex items-center space-x-1 shrink-0 pb-0.5">
                <label
                  className="cursor-pointer p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".py,.cpp,.java,.js,.ts,.go,.rs,.txt,.md,.json,.csv"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleToggleMic}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isRecording
                      ? "bg-rose-500/10 text-rose-500 animate-pulse"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  title={isRecording ? "Stop listening" : "Voice input"}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>

                {isLoading ? (
                  <Button
                    size="iconSm"
                    variant="destructive"
                    onClick={handleStop}
                    title="Stop generation"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </Button>
                ) : (
                  <Button
                    size="iconSm"
                    onClick={() => handleSend()}
                    disabled={!input.trim() && attachedFiles.length === 0}
                    title="Send message"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>NOVA • ChatGPT style with live code execution</span>
              <button
                onClick={() => setIsSideRunnerOpen(!isSideRunnerOpen)}
                className="hover:underline flex items-center space-x-1"
              >
                <Code2 className="h-3 w-3 mr-0.5" />
                <span>{isSideRunnerOpen ? "Hide Sandbox Runner" : "Open Sandbox Runner"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Side-by-Side Multi-Language Program Runner */}
      {isSideRunnerOpen && (
        <div className="w-full lg:w-1/2 flex flex-col h-full bg-[#0d1117] text-slate-100 border-l border-border animate-in slide-in-from-right duration-200">
          {/* Runner Header Bar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 bg-[#161b22]">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-xs text-slate-200">Runner:</span>
              <select
                value={runnerLang}
                onChange={(e) => {
                  const newL = e.target.value as SupportedLanguage;
                  setRunnerLang(newL);
                  setRunnerCode(LANGUAGES[newL].starterTemplate);
                  setRunnerResult(null);
                }}
                className="h-7 rounded bg-[#21262d] border border-white/10 px-2 py-0 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {Object.values(LANGUAGES).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>

              <Button
                size="sm"
                onClick={handleExecuteSideRunner}
                disabled={isRunnerRunning}
                className="h-7 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs space-x-1"
              >
                {isRunnerRunning ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 fill-current" />
                )}
                <span>Run</span>
              </Button>
            </div>

            <div className="flex items-center space-x-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRunnerCode(LANGUAGES[runnerLang].starterTemplate);
                  setRunnerResult(null);
                  toast.info("Reset code");
                }}
                className="h-7 px-2 text-xs text-slate-400 hover:text-white"
                title="Reset starter template"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Reset</span>
              </Button>

              <button
                onClick={() => setIsSideRunnerOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close side runner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Monaco Editor Upper Half */}
          <div className="h-[55%] relative border-b border-border/40">
            <MonacoWrapper
              language={LANGUAGES[runnerLang].monacoLanguage}
              value={runnerCode}
              onChange={(val) => setRunnerCode(val || "")}
            />
          </div>

          {/* Stdin & Execution Console Lower Half */}
          <div className="h-[45%] flex flex-col bg-[#090d13] text-xs font-mono">
            {/* Console Toolbar */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-[#12161f] text-[11px] text-slate-400">
              <div className="flex items-center space-x-2">
                <Terminal className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold text-slate-200">Terminal Output</span>
                {runnerResult && (
                  <Badge
                    variant={runnerResult.status === "accepted" ? "success" : "destructive"}
                    className="text-[10px] h-4 py-0"
                  >
                    {runnerResult.status === "accepted" ? "Exit 0" : runnerResult.statusDescription}
                  </Badge>
                )}
              </div>

              {runnerResult && (
                <div className="flex items-center space-x-3">
                  {runnerResult.timeMs !== null && <span>{formatMs(runnerResult.timeMs)}</span>}
                  {runnerResult.memoryKb !== null && (
                    <span>{formatBytes(runnerResult.memoryKb * 1024)}</span>
                  )}
                </div>
              )}
            </div>

            {/* Custom Stdin Row */}
            <div className="px-3 py-1 bg-[#10141d] border-b border-white/5 flex items-center space-x-2">
              <span className="text-[11px] text-slate-400 whitespace-nowrap">Stdin:</span>
              <input
                type="text"
                value={runnerStdin}
                onChange={(e) => setRunnerStdin(e.target.value)}
                placeholder="Optional input passed to program..."
                className="flex-1 bg-transparent border-0 text-slate-200 text-xs font-mono focus:outline-none placeholder:text-slate-600"
              />
            </div>

            {/* Terminal Body */}
            <div className="flex-1 overflow-y-auto p-3 whitespace-pre-wrap select-text leading-relaxed">
              {isRunnerRunning && (
                <div className="flex items-center space-x-2 text-primary animate-pulse">
                  <span>Executing in sandbox...</span>
                </div>
              )}

              {!isRunnerRunning && !runnerResult && (
                <div className="text-slate-500 italic py-4 text-center">
                  Click &quot;Run&quot; to execute your {LANGUAGES[runnerLang].name} program.
                </div>
              )}

              {runnerResult?.compileOutput && (
                <div className="p-2 rounded bg-rose-950/20 border border-rose-500/30 text-rose-300 mb-2">
                  <span className="font-semibold block mb-0.5">Compiler Diagnostic:</span>
                  {runnerResult.compileOutput}
                </div>
              )}

              {runnerResult?.stdout && (
                <div className="text-slate-200">{runnerResult.stdout}</div>
              )}

              {runnerResult?.stderr && (
                <div className="text-rose-400 mt-1">{runnerResult.stderr}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
