import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().url().default("postgres://postgres:postgres@localhost:5432/nova"),
  AUTH_SECRET: z.string().min(16).default("default-development-auth-secret-32-chars-long"),
  AUTH_URL: z.string().url().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  
  AI_MODEL_FAST: z.string().default("gpt-4o-mini"),
  AI_MODEL_SMART: z.string().default("gpt-4o"),
  AI_ALLOWED_MODELS: z.string().default("gpt-4o-mini,gpt-4o,claude-3-5-haiku-20241022,claude-3-5-sonnet-20241022,gemini-1.5-flash,gemini-1.5-pro"),
  
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  
  JUDGE0_URL: z.string().url().default("https://ce.judge0.com"),
  JUDGE0_AUTH_TOKEN: z.string().optional(),
  
  TAVILY_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  ADMIN_EMAILS: z.string().default("admin@novacode.dev"),
  CRON_SECRET: z.string().default("nova-cron-secret-token"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("NOVA"),
});

function validateEnv() {
  const parsedServer = serverSchema.safeParse(process.env);
  const parsedClient = clientSchema.safeParse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  });

  if (!parsedServer.success) {
    console.error("❌ Invalid server environment variables:", parsedServer.error.flatten().fieldErrors);
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid server environment variables in production.");
    }
  }

  if (!parsedClient.success) {
    console.error("❌ Invalid client environment variables:", parsedClient.error.flatten().fieldErrors);
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid client environment variables in production.");
    }
  }

  return {
    ...serverSchema.parse(process.env || {}),
    ...parsedClient.data,
  };
}

export const env = validateEnv();
