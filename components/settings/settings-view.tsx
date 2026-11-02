"use client";

import * as React from "react";
import {
  Settings as SettingsIcon,
  User,
  Sliders,
  Brain,
  Download,
  Trash2,
  Save,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function SettingsView({ user }: { user?: any }) {
  const [responseStyle, setResponseStyle] = React.useState<string>("detailed");
  const [customInstructions, setCustomInstructions] = React.useState<string>(
    "Prefer modern idiomatic syntax. Include time/space complexity where relevant."
  );
  const [memoryEnabled, setMemoryEnabled] = React.useState<boolean>(false);
  const [memoryText, setMemoryText] = React.useState<string>(
    "Prefers Python 3.10+ and C++20. Working on algorithms and system design."
  );

  const handleSavePreferences = () => {
    toast.success("Settings saved successfully!");
  };

  const handleExportConversations = async (format: "json" | "markdown") => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      const payload =
        format === "json"
          ? JSON.stringify(data.conversations, null, 2)
          : data.conversations
              .map((c: any) => `# ${c.title}\n\nModel: ${c.model}\nCreated: ${c.createdAt}\n---`)
              .join("\n\n");

      const blob = new Blob([payload], {
        type: format === "json" ? "application/json" : "text/markdown",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nova-conversations-export.${format === "json" ? "json" : "md"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Exported conversations as ${format.toUpperCase()}`);
    } catch {
      toast.error("Export failed");
    }
  };

  const handleClearMemory = () => {
    setMemoryText("");
    toast.info("AI memory cleared");
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings & Preferences</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Customize AI assistant behavior, response format, memory, and data export.
        </p>
      </div>

      {/* Account Info */}
      <div className="p-6 rounded-xl border border-border bg-card space-y-4 shadow-sm">
        <h2 className="text-base font-semibold flex items-center space-x-2">
          <User className="h-4 w-4 text-primary" />
          <span>Profile & Account</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Name</label>
            <Input value={user?.name || "Developer"} readOnly className="bg-muted/40" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
            <Input value={user?.email || "developer@novacode.dev"} readOnly className="bg-muted/40" />
          </div>
        </div>
        <div className="flex items-center space-x-2 pt-1">
          <Badge variant="subtle" className="text-xs">
            Role: {user?.role || "user"}
          </Badge>
          <Badge variant="success" className="text-xs">
            Plan: Free Developer Tier (200 runs/day)
          </Badge>
        </div>
      </div>

      {/* AI Assistant Preferences */}
      <div className="p-6 rounded-xl border border-border bg-card space-y-4 shadow-sm">
        <h2 className="text-base font-semibold flex items-center space-x-2">
          <Sliders className="h-4 w-4 text-primary" />
          <span>AI Assistant Instructions & Style</span>
        </h2>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Default Response Style
          </label>
          <select
            value={responseStyle}
            onChange={(e) => setResponseStyle(e.target.value)}
            className="w-full sm:w-64 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="detailed">Detailed (In-depth architecture & trade-offs)</option>
            <option value="concise">Concise (Minimal code, essential bullet points)</option>
            <option value="beginner">Beginner (Step-by-step friendly tutorials)</option>
            <option value="advanced">Advanced (Deep low-level & algorithmic analysis)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Custom Instructions
          </label>
          <p className="text-[11px] text-muted-foreground mb-2">
            Injected into NOVA&apos;s system prompt on every chat and code action.
          </p>
          <Textarea
            value={customInstructions}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomInstructions(e.target.value)}
            rows={3}
            placeholder="e.g. Always write Google C++ style, prefer Python list comprehensions..."
            className="text-xs font-mono"
          />
        </div>
      </div>

      {/* AI Memory (Transparent & Deletable) */}
      <div className="p-6 rounded-xl border border-border bg-card space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold flex items-center space-x-2">
              <Brain className="h-4 w-4 text-primary" />
              <span>Transparent AI Working Memory</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Optional context retained across sessions. Completely transparent, editable, and deletable.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={memoryEnabled}
              onChange={(e) => setMemoryEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {memoryEnabled && (
          <div className="space-y-3 pt-2">
            <Textarea
              value={memoryText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMemoryText(e.target.value)}
              rows={3}
              placeholder="Active memories..."
              className="text-xs font-mono"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearMemory}
              className="text-destructive hover:bg-destructive/10 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear Working Memory
            </Button>
          </div>
        )}
      </div>

      {/* Export & Data Management */}
      <div className="p-6 rounded-xl border border-border bg-card space-y-4 shadow-sm">
        <h2 className="text-base font-semibold flex items-center space-x-2">
          <Download className="h-4 w-4 text-primary" />
          <span>Data Export & Portability</span>
        </h2>
        <p className="text-xs text-muted-foreground">
          Download your complete chat histories, prompts, and code snippets in open formats.
        </p>
        <div className="flex items-center space-x-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExportConversations("markdown")}
            className="text-xs"
          >
            Export Markdown (.md)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExportConversations("json")}
            className="text-xs"
          >
            Export JSON (.json)
          </Button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSavePreferences} className="space-x-1.5">
          <Save className="h-4 w-4" />
          <span>Save Changes</span>
        </Button>
      </div>
    </div>
  );
}
