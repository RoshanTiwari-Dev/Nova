"use client";

import * as React from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { computeLineDiff, DiffPart } from "@/lib/utils";
import { Check, Undo2, GitCommit, FileCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DiffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalCode: string;
  proposedCode: string;
  summary: string;
  fileName?: string;
  onApprove: (newCode: string) => void;
  onReject?: () => void;
}

export function DiffModal({
  open,
  onOpenChange,
  originalCode,
  proposedCode,
  summary,
  fileName = "main.py",
  onApprove,
  onReject,
}: DiffModalProps) {
  const diffParts: DiffPart[] = React.useMemo(() => {
    return computeLineDiff(originalCode, proposedCode);
  }, [originalCode, proposedCode]);

  const addedCount = diffParts.filter((p) => p.added).length;
  const removedCount = diffParts.filter((p) => p.removed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center space-x-2">
          <GitCommit className="h-5 w-5 text-primary" />
          <DialogTitle>Review Proposed AI Changes</DialogTitle>
        </div>
        <DialogDescription>
          {summary || "Review the code diff below. Click 'Approve & Apply' to update the editor."}
        </DialogDescription>
        <div className="flex items-center space-x-3 pt-2 text-xs">
          <Badge variant="outline" className="space-x-1">
            <FileCode className="h-3 w-3 mr-1" />
            <span>{fileName}</span>
          </Badge>
          <span className="text-emerald-500 font-medium">+{addedCount} additions</span>
          <span className="text-rose-500 font-medium">-{removedCount} deletions</span>
        </div>
      </DialogHeader>

      {/* Diff Viewer */}
      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-[#0d1117] font-mono text-xs p-3">
        {diffParts.map((part, index) => {
          let lineBg = "bg-transparent text-slate-300";
          let linePrefix = "  ";

          if (part.added) {
            lineBg = "bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500";
            linePrefix = "+ ";
          } else if (part.removed) {
            lineBg = "bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 line-through opacity-80";
            linePrefix = "- ";
          }

          return (
            <div key={index} className={`whitespace-pre-wrap py-0.5 px-2 ${lineBg}`}>
              {part.value.split("\n").map((line, lIdx, arr) => {
                // Ignore trailing empty split
                if (lIdx === arr.length - 1 && line === "") return null;
                return (
                  <div key={lIdx}>
                    <span className="select-none opacity-50 mr-2">{linePrefix}</span>
                    {line}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onOpenChange(false);
            if (onReject) onReject();
          }}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium space-x-1.5"
          onClick={() => {
            onApprove(proposedCode);
            onOpenChange(false);
          }}
        >
          <Check className="h-4 w-4" />
          <span>Approve & Apply Changes</span>
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
