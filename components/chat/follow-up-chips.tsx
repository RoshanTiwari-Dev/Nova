"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

interface FollowUpChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
}

export function FollowUpChips({
  suggestions,
  onSelect,
  disabled,
}: FollowUpChipsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 pt-2">
      <div className="flex items-center space-x-1 text-xs text-muted-foreground mr-1">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-medium">Follow-ups:</span>
      </div>
      {suggestions.map((suggestion, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
          className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 px-3 py-1 text-xs text-primary transition-all hover:scale-[1.02] disabled:opacity-50 text-left shadow-sm"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
