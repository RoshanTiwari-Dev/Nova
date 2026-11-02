"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamic import with ssr: false to satisfy Section 9
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#1e1e1e] text-slate-400">
      <div className="flex items-center space-x-2 text-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>Loading Monaco Editor...</span>
      </div>
    </div>
  ),
});

interface MonacoWrapperProps {
  language: string;
  value: string;
  onChange: (value: string | undefined) => void;
  onMount?: (editor: any, monaco: any) => void;
  theme?: string;
  readOnly?: boolean;
}

export function MonacoWrapper({
  language,
  value,
  onChange,
  onMount,
  theme = "vs-dark",
  readOnly = false,
}: MonacoWrapperProps) {
  return (
    <div className="h-full w-full overflow-hidden">
      <Editor
        height="100%"
        language={language}
        value={value}
        theme={theme}
        onChange={onChange}
        onMount={onMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          roundedSelection: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          formatOnPaste: true,
          formatOnType: true,
          bracketPairColorization: { enabled: true },
          cursorBlinking: "smooth",
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}
