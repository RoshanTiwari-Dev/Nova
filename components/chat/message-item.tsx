"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  Sparkles,
  User,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  Edit2,
} from "lucide-react";
import { CodeBlock } from "./code-block";
import { FollowUpChips } from "./follow-up-chips";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MessageItemProps {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string | Date;
  onRegenerate?: () => void;
  onEditAndResend?: (content: string) => void;
  onFollowUpClick?: (suggestion: string) => void;
  isLatest?: boolean;
}

export function MessageItem({
  id,
  role,
  content,
  createdAt,
  onRegenerate,
  onEditAndResend,
  onFollowUpClick,
  isLatest,
}: MessageItemProps) {
  const [copied, setCopied] = React.useState(false);
  const [rating, setRating] = React.useState<"up" | "down" | null>(null);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(content);

  const isUser = role === "user";

  // Parse follow-up chips if present in assistant response
  let cleanContent = content
    .replace(/^f:\{"messageId":.*?\}/m, "")
    .replace(/^\{"messageId":.*?\}/m, "")
    .trim();
  let parsedSuggestions: string[] = [];

  const suggestionMatch = content.match(/<!-- SUGGESTIONS: (.*?) -->/);
  if (suggestionMatch) {
    try {
      parsedSuggestions = JSON.parse(suggestionMatch[1]);
      cleanContent = cleanContent.replace(suggestionMatch[0], "").trim();
    } catch {
      // ignore
    }
  }

  // Provide fallback chips for late turns if none returned
  if (!isUser && parsedSuggestions.length === 0 && isLatest) {
    parsedSuggestions = [
      "Tell me more about this",
      "Give me an example",
      "What are the key takeaways?",
    ];
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanContent);
    setCopied(true);
    toast.success("Message copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = async (vote: "up" | "down") => {
    if (rating === vote) return;
    setRating(vote);
    toast.success(vote === "up" ? "Helpful feedback recorded" : "Feedback recorded");
  };

  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Text-to-speech not supported in this browser");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Strip code blocks for audio speech
    const speechText = cleanContent.replace(/```[\s\S]*?```/g, "Code block omitted.");
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    setIsEditing(false);
    if (onEditAndResend) {
      onEditAndResend(editText);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex w-full space-x-3 py-4 px-3 sm:px-4 rounded-xl transition-colors",
        isUser ? "bg-muted/30" : "bg-card/40 hover:bg-card/70"
      )}
    >
      {/* Avatar */}
      <div className="shrink-0 pt-0.5">
        {isUser ? (
          <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground shadow-sm">
            <User className="h-4 w-4" />
          </div>
        ) : (
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white shadow-md shadow-primary/20">
            <Sparkles className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Header line */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-foreground">
              {isUser ? "You" : "NOVA"}
            </span>
            {createdAt && (
              <span className="text-[11px] text-muted-foreground">
                {new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
            {isUser && !isEditing && onEditAndResend && (
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => setIsEditing(true)}
                title="Edit and resend"
              >
                <Edit2 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </Button>
            )}

            {!isUser && (
              <>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={handleSpeak}
                  title={isSpeaking ? "Stop audio" : "Read aloud"}
                >
                  {isSpeaking ? (
                    <VolumeX className="h-3 w-3 text-primary animate-pulse" />
                  ) : (
                    <Volume2 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => handleFeedback("up")}
                  className={rating === "up" ? "text-primary" : "text-muted-foreground"}
                  title="Helpful"
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => handleFeedback("down")}
                  className={rating === "down" ? "text-destructive" : "text-muted-foreground"}
                  title="Not helpful"
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
                {onRegenerate && isLatest && (
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={onRegenerate}
                    title="Regenerate response"
                  >
                    <RotateCcw className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </Button>
                )}
              </>
            )}

            <Button variant="ghost" size="iconSm" onClick={handleCopy} title="Copy message">
              {copied ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-2 mt-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full rounded-md border border-input bg-background p-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
            />
            <div className="flex items-center space-x-2">
              <Button size="sm" onClick={handleSaveEdit}>
                Save & Resend
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words text-sm leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  const codeString = String(children).replace(/\n$/, "");

                  if (!inline && match) {
                    return <CodeBlock language={match[1]} code={codeString} />;
                  }

                  if (!inline && codeString.includes("\n")) {
                    return <CodeBlock language="text" code={codeString} />;
                  }

                  return (
                    <code
                      className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs text-primary font-medium"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {cleanContent}
            </ReactMarkdown>
          </div>
        )}

        {/* Suggestions chips */}
        {!isUser && onFollowUpClick && (
          <FollowUpChips
            suggestions={parsedSuggestions}
            onSelect={onFollowUpClick}
          />
        )}
      </div>
    </div>
  );
}
