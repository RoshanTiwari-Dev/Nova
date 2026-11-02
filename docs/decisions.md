# NOVA — Architecture & Provider Decisions

This document captures the verified design choices, provider selections, system constraints, and operational assumptions made for **NOVA** as specified in the AI Chatbot + Online Compiler Specification.

---

## 1. AI Layer & Model Strategy

- **Orchestration**: Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`).
- **Two-Tier Model Routing**:
  - `AI_MODEL_FAST` (Default: `gpt-4o-mini`, alternates: `claude-3-5-haiku-20241022`, `gemini-1.5-flash`): Used for streaming chat responses, conversational titles, follow-up chip suggestions, and basic explanations. Delivers sub-second latency and low operational cost.
  - `AI_MODEL_SMART` (Default: `gpt-4o`, alternates: `claude-3-5-sonnet-20241022`, `gemini-1.5-pro`): Used for code generation, structural debugging, diff creation (`generateObject`), and algorithmic complexity analysis.
- **Provider Interchangeability**: Swappable at runtime via standard environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`) without requiring application recompilation.
- **Allowlist Filtering**: UI model selector queries `AI_ALLOWED_MODELS` to guarantee users only pick allowed, budgeted models.

---

## 2. Code Execution Sandbox

- **Primary Runner**: **Judge0 CE** (Community Edition) hosted in an isolated container environment or via managed endpoint (`JUDGE0_URL`).
- **Fallback Runner**: **Piston** adapter (`lib/runner/piston.ts`) and built-in safe sandbox emulation for offline preview environments.
- **Asynchronous Execution Protocol**:
  - Web client dispatches code and custom standard input to `POST /api/run`.
  - Backend validates payloads via Zod, encodes source code in Base64 (`base64_encoded=true`), and submits with `wait=false`.
  - Client polls `GET /api/run/[token]` at ~800ms intervals until terminal status is reached.
- **Runner Security Limits**:
  - CPU Time Limit: 5.0 seconds
  - Wall Clock Time Limit: 10.0 seconds
  - Memory Limit: 256 MB (256,000 KB)
  - Output Truncation: 64 KB
  - Network: Completely disabled (`network: false`)
- **Language ID Standard Table (`lib/runner/languages.ts`)**:
  - **C++**: GCC 9.2.0 (Judge0 ID 54) / GCC 14 (ID 105)
  - **Java**: OpenJDK 13.0.1 (Judge0 ID 62)
  - **Python**: Python 3.8.1 (Judge0 ID 71) / Python 3.12 (ID 100)
  - Extensible to JavaScript (Node.js 18), TypeScript, Go, and Rust.

---

## 3. Database & Persistence Layer

- **Database**: **Neon Serverless Postgres** via `@neondatabase/serverless` and **Drizzle ORM**.
- **Adapter**: Auth.js (`@auth/drizzle-adapter`) using pooled connection strings.
- **Data Retention & Privacy**:
  - Code execution outputs are kept for 30 days and automatically pruned via Vercel Cron (`GET /api/cron/cleanup`), protected by `CRON_SECRET`.
  - AI Memory is opt-in, transparent, editable, and deletable by the user at any time.

---

## 4. Rate Limiting & Abuse Prevention

- **Provider**: **Upstash Redis** (`@upstash/ratelimit`, `@upstash/redis`) with memory sliding-window fallback for local development.
- **Quotas**:
  - AI Chat: 30 requests/minute per user/IP
  - Code Execution: 20 runs/minute, 200 runs/day on free tier
  - AI Code Actions: 30 requests/minute
- **Input Boundaries**:
  - Maximum Code Size: 100 KB
  - Maximum Stdin Size: 64 KB
  - Maximum File Upload Size: 20 MB (Vercel Blob direct browser upload)

---

## 5. Security Headers & CSP

- Content Security Policy (CSP) is configured in `next.config.mjs` to permit Monaco Editor web worker scripts (`worker-src 'self' blob:;`) and KaTeX / Highlight.js styling while maintaining `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`.
