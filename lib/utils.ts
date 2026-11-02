import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as Diff from "diff";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatMs(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Standard heuristic: ~4 characters per token
  return Math.ceil(text.length / 4);
}

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export function computeLineDiff(oldCode: string, newCode: string): DiffPart[] {
  return Diff.diffLines(oldCode, newCode);
}

export function generateUnifiedPatch(
  fileName: string,
  oldCode: string,
  newCode: string
): string {
  return Diff.createTwoFilesPatch(
    `a/${fileName}`,
    `b/${fileName}`,
    oldCode,
    newCode,
    "current",
    "proposed"
  );
}

export function truncateText(str: string, maxLength = 2000): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + `\n... [truncated ${str.length - maxLength} chars]`;
}
