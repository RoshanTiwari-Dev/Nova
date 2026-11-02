"use client";

import * as React from "react";
import { Sliders, ChevronDown } from "lucide-react";

interface StyleSelectorProps {
  style: "concise" | "detailed" | "beginner" | "advanced";
  onChangeStyle: (style: "concise" | "detailed" | "beginner" | "advanced") => void;
}

const STYLES = [
  { id: "detailed", name: "Detailed", desc: "Full architectural breakdown & trade-offs" },
  { id: "concise", name: "Concise", desc: "Just the essential code and minimal explanation" },
  { id: "beginner", name: "Beginner", desc: "Step-by-step friendly explanations & definitions" },
  { id: "advanced", name: "Advanced", desc: "Low-level performance, memory & algorithms" },
] as const;

export function StyleSelector({ style, onChangeStyle }: StyleSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const current = STYLES.find((s) => s.id === style) || STYLES[0];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center space-x-1.5 rounded-lg border border-border bg-card/60 hover:bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition-colors"
      >
        <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{current.name}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 mt-1.5 w-60 rounded-xl border border-border bg-card p-1.5 shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Response Style
            </div>
            <div className="space-y-1">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    onChangeStyle(s.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex flex-col ${
                    s.id === style
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-[11px] text-muted-foreground">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
