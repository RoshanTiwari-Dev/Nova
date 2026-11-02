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
} from "lucide-react";
import { MessageItem } from "./message-item";
import { ModelSelector } from "./model-selector";
import { StyleSelector } from "./style-selector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load conversation messages if conversationId changed
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

      // Read stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      const assistantId = nanoid(12);

      // Add temporary placeholder for assistant
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", createdAt: new Date() },
      ]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          
          // AI SDK data stream protocol parsing: 0:"token" or plain text
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("0:")) {
              try {
                const token = JSON.parse(line.slice(2));
                assistantText += token;
              } catch {
                assistantText += line.slice(2);
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
        toast.info("Generation stopped by user");
      } else {
        toast.error(err?.message || "Error generating response");
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(12),
            role: "assistant",
            content: `⚠️ **Error:** ${err?.message || "Failed to reach AI service."}\n\nPlease check your API keys in \`.env.local\` or select an alternate model from the selector above.`,
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

  // Speech-to-Text Handler
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
        toast.info("Listening... speak your coding request");
      };

      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInput((prev) => (prev ? prev + " " + transcript : transcript));
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // File Upload Handler (reads text directly for grounding)
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

  const starterPrompts = [
    {
      title: "C++ QuickSort with Benchmark",
      desc: "Generate optimal C++ QuickSort with custom median-of-three pivot",
      prompt: "Write a high-performance C++ implementation of QuickSort using median-of-three pivot selection. Include a main() function that sorts an array from stdin and prints execution stats.",
    },
    {
      title: "Java LRU Cache with O(1)",
      desc: "Implement a thread-safe LRU Cache using HashMap + Doubly LinkedList",
      prompt: "Implement an LRU Cache in Java with O(1) get and put operations using a custom Doubly Linked List and HashMap. Provide thorough test cases in Main.java.",
    },
    {
      title: "Python Graph Dijkstra",
      desc: "Dijkstra's Shortest Path algorithm with priority queue & ASCII visualizer",
      prompt: "Write a clean Python 3 implementation of Dijkstra's Shortest Path algorithm using heapq. Read the graph nodes and edges from standard input.",
    },
    {
      title: "Debug & Fix Segfault",
      desc: "Explain and debug memory corruption and pointer issues",
      prompt: "Explain how to diagnose and prevent segmentation faults when working with raw pointers and dynamic memory allocation in modern C++.",
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen bg-background relative overflow-hidden">
      {/* Top Options Bar */}
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
            title="Toggle Tavily web search for live documentation and research"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Web Search</span>
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto py-10 px-4 text-center space-y-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 text-white shadow-xl shadow-primary/25 animate-glow">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                How can NOVA assist your code today?
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Ask coding questions, generate algorithms, run code in the sandbox, or debug errors with live diffs.
              </p>
            </div>

            {/* Quick Starters */}
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
          <div className="max-w-4xl mx-auto space-y-3">
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
                <span>NOVA is thinking and generating solution...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Box Footer */}
      <div className="p-3 sm:p-4 border-t border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* File Attachments Pills */}
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

          {/* Prompt Form */}
          <div className="relative flex items-end rounded-xl border border-input bg-background/80 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-primary p-2">
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
              placeholder="Ask NOVA to write, explain, debug, or optimize code... (Enter to send, Shift+Enter for newline)"
              rows={Math.min(input.split("\n").length || 1, 5)}
              className="flex-1 bg-transparent border-0 px-2 py-1 text-sm placeholder:text-muted-foreground focus:outline-none resize-none max-h-36"
            />

            <div className="flex items-center space-x-1 shrink-0 pb-0.5">
              {/* File Attachment Input */}
              <label
                className="cursor-pointer p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Attach source code, text, or docs"
              >
                <Paperclip className="h-4 w-4" />
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".py,.cpp,.java,.js,.ts,.go,.rs,.txt,.md,.json,.csv"
                />
              </label>

              {/* Speech-to-Text Button */}
              <button
                type="button"
                onClick={handleToggleMic}
                className={`p-1.5 rounded-lg transition-colors ${
                  isRecording
                    ? "bg-rose-500/10 text-rose-500 animate-pulse"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title={isRecording ? "Stop listening" : "Voice input (Speech to Text)"}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              {/* Send or Stop Button */}
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
                  title="Send message (Enter)"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span>NOVA v1.0 • Sandboxed Judge0 Code Execution</span>
            <span>Ctrl/Cmd + Enter to run code</span>
          </div>
        </div>
      </div>
    </div>
  );
}
