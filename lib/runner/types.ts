export type SupportedLanguage = "cpp" | "java" | "python" | "javascript" | "typescript" | "go" | "rust";

export interface ExecutionRequest {
  language: SupportedLanguage;
  code: string;
  stdin?: string;
  cpuTimeLimit?: number; // seconds
  wallTimeLimit?: number; // seconds
  memoryLimit?: number; // KB
}

export type ExecutionStatusType =
  | "queue"
  | "processing"
  | "accepted"
  | "compilation_error"
  | "runtime_error"
  | "time_limit_exceeded"
  | "memory_limit_exceeded"
  | "internal_error"
  | "exec_format_error"
  | "unknown";

export interface ExecutionResult {
  token?: string;
  status: ExecutionStatusType;
  statusDescription: string;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  exitCode: number | null;
  timeMs: number | null;
  memoryKb: number | null;
  language: SupportedLanguage;
  runtimeVersion?: string;
  createdAt?: string;
}

export interface CodeRunner {
  submit(request: ExecutionRequest): Promise<{ token: string }>;
  getResult(token: string): Promise<ExecutionResult>;
  runSync?(request: ExecutionRequest): Promise<ExecutionResult>;
}
