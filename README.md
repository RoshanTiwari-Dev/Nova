# NOVA — Your AI Coding Companion

> **NOVA** is a high-performance, full-stack AI coding assistant and online sandbox compiler built with Next.js (App Router), TypeScript, Vercel AI SDK, and Monaco Editor, designed specifically for seamless zero-config deployment on Vercel.

---

## 🚀 Features

1. **AI Chat Engine with Streaming**:
   - Real-time streaming responses via Vercel AI SDK (`streamText`) and `useChat`.
   - Rich Markdown rendering with GFM tables, syntax-highlighted code blocks, and KaTeX mathematical notations ($O(n \log n)$).
   - Instant action buttons on every code block: **Copy**, **Run Code**, and **Open in Editor**.
   - 3 interactive follow-up suggestion chips generated after every solution.
   - Persona style control: *Concise*, *Detailed*, *Beginner*, and *Advanced*.
   - Voice interaction: Speech-to-Text (STT) and Text-to-Speech (TTS) audio narration.
   - Grounded web search with real-time technical documentation via Tavily.

2. **AI Programming Assistant & Diff Engine**:
   - One-click actions: *Explain line-by-line*, *Debug*, *Fix with NOVA*, *Optimize*, *Convert language*, *Generate Unit Tests*, *Asymptotic Complexity*, and *Rigorous Code Review*.
   - Structured JSON diff generation (`generateObject`) with line-by-line additions/deletions preview modal, single-click approval, and undo functionality.

3. **Online Compiler & IDE**:
   - Monaco Editor loaded lazily with syntax highlighting, auto-completion, line numbers, bracket matching, and code formatting.
   - Multi-language sandbox: **C++ (GCC 9.2.0)**, **Java (OpenJDK 13.0.1)**, **Python 3.8.1**, JavaScript, TypeScript, Go, and Rust.
   - Custom `stdin` input console and stdout/stderr execution metrics (Time in ms, Memory in KB, Exit Code).
   - Custom test case manager: define multiple test cases with expected vs actual output comparison and "Run All Tests".
   - Download source file, reset starter template, and share read-only link.

4. **AI + Compiler Closed-Loop Integration**:
   - Code from chat opens directly into the IDE with one click.
   - Upon a failed execution, NOVA offers **Explain Error** and **Fix with NOVA**, analyzing the compiler diagnostic and proposing a reviewable diff.

5. **Learning Hub & DSA Lab**:
   - Curated DSA problems (Easy, Medium, Hard) with 1-click "Solve in IDE".
   - Interactive CS Quizzes and MCQs with instant answer feedback and explanations.
   - Step-by-step Recursion & Call Stack visualizer for algorithms.

6. **Security & Production Hardening**:
   - Isolated remote runner (Judge0 CE / Piston) — user code never executes inside Vercel serverless functions.
   - Rate limiting powered by Upstash Redis (20 runs/min, 30 chat msgs/min).
   - Input validation with strict Zod schemas (100 KB code limit, 64 KB stdin limit).
   - Automated 30-day execution log cleanup via Vercel Cron.
   - Admin telemetry console with system metrics and feature flags.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) + TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui + Lucide Icons |
| **AI SDK** | Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`) |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Code Execution** | Judge0 CE / Piston adapter |
| **Database** | Neon Serverless Postgres + Drizzle ORM |
| **Authentication** | Auth.js (NextAuth v5) + Drizzle Adapter + OAuth & Guest Dev mode |
| **Rate Limiting** | Upstash Redis (`@upstash/ratelimit`, `@upstash/redis`) |
| **File Storage** | Vercel Blob (`@vercel/blob`) |
| **Monitoring** | Sentry for Next.js + Vercel Analytics |

---

## 📦 Local Development Setup

### 1. Prerequisites
- **Node.js**: v20.0.0 or higher
- **npm** or **pnpm**
- (Optional) Docker for self-hosting Judge0 CE

### 2. Clone and Install
```bash
git clone https://github.com/your-username/nova.git
cd nova
npm install
```

### 3. Configure Environment Variables
Copy the `.env.example` file to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your provider API keys in `.env.local`:
```env
# Database (Neon Serverless Postgres)
DATABASE_URL="postgres://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Auth.js (Generate key: openssl rand -base64 32)
AUTH_SECRET="your-32-byte-secret"
AUTH_URL="http://localhost:3000"

# AI Provider (OpenAI, Anthropic, or Google)
OPENAI_API_KEY="sk-..."
AI_MODEL_FAST="gpt-4o-mini"
AI_MODEL_SMART="gpt-4o"

# Runner (Judge0 CE default public instance or self-hosted)
JUDGE0_URL="https://ce.judge0.com"
JUDGE0_AUTH_TOKEN=""

# Upstash Redis (Rate limiting)
UPSTASH_REDIS_REST_URL="https://example.upstash.io"
UPSTASH_REDIS_REST_TOKEN="token"
```

### 4. Database Migrations
Generate and push database tables to Neon:
```bash
npm run db:generate
npm run db:migrate
```

### 5. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

Run unit tests and adapter checks with Vitest:
```bash
npm run test
```

Perform TypeScript type check:
```bash
npm run typecheck
```

Build Next.js production bundle:
```bash
npm run build
```

---

## ☁️ Vercel Deployment Guide

Deploying NOVA to Vercel takes less than 3 minutes:

### 1. Push to GitHub
```bash
git add .
git commit -m "feat: complete NOVA release"
git push origin main
```

### 2. Import Project in Vercel
1. Go to [vercel.com/new](https://vercel.com/new) and select the `nova` repository.
2. Framework Preset: **Next.js**.
3. Under **Integrations / Storage (Marketplace)**:
   - Add **Neon Postgres**: automatically provisions `DATABASE_URL`.
   - Add **Upstash Redis**: automatically provisions `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
   - Enable **Vercel Blob**: automatically provisions `BLOB_READ_WRITE_TOKEN`.

### 3. Configure Environment Variables in Vercel
Under **Project Settings → Environment Variables**, add:
- `AUTH_SECRET`: generate with `openssl rand -base64 32`
- `AUTH_URL`: `https://your-project.vercel.app` (or your custom domain)
- `OPENAI_API_KEY`: your OpenAI key
- `AI_MODEL_FAST`: `gpt-4o-mini`
- `AI_MODEL_SMART`: `gpt-4o`
- `JUDGE0_URL`: `https://ce.judge0.com` (or your private Judge0 instance URL)
- `JUDGE0_AUTH_TOKEN`: optional token for your Judge0 host
- `CRON_SECRET`: random string to protect the cleanup cron endpoint
- `ADMIN_EMAILS`: your admin email (e.g. `admin@novacode.dev`)

### 4. Vercel Configuration (`vercel.json`)
The repository includes preconfigured function duration overrides and cron scheduling:
```json
{
  "functions": {
    "app/api/chat/route.ts": { "maxDuration": 60 },
    "app/api/ai/code-action/route.ts": { "maxDuration": 60 },
    "app/api/run/route.ts": { "maxDuration": 30 }
  },
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### 5. Deploy & Verify
Click **Deploy**. Once built, verify:
- AI Chat streaming works at `/chat`.
- C++, Java, and Python run and display structured outputs at `/ide`.
- "Fix with NOVA" generates diff reviews upon failed executions.
- Learning Hub loads interactive quizzes and visualizers at `/learn`.
