"use client";

import * as React from "react";
import { Cpu, ChevronDown } from "lucide-react";
import { AVAILABLE_MODELS, ModelDescriptor } from "@/lib/ai/models";

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

export function ModelSelector({
  selectedModel,
  onSelectModel,
}: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const current =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center space-x-1.5 rounded-lg border border-border bg-card/60 hover:bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition-colors"
      >
        <Cpu className="h-3.5 w-3.5 text-primary" />
        <span className="font-semibold">{current.name}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 mt-1.5 w-64 rounded-xl border border-border bg-card p-1.5 shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Select AI Model
            </div>
            <div className="space-y-1">
              {AVAILABLE_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectModel(m.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex flex-col ${
                    m.id === selectedModel
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{m.name}</span>
                    <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground">
                      {m.tier}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    {m.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
