import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "@/lib/env";

const openaiApiKey =
  env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";

const googleApiKey =
  env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";

export const openai = createOpenAI({
  apiKey: openaiApiKey || "sk-dummy-key-for-initialization",
});

export const anthropic = createAnthropic({
  apiKey: env.ANTHROPIC_API_KEY || "dummy-anthropic-key",
});

export const google = createGoogleGenerativeAI({
  apiKey: googleApiKey || "dummy-google-key",
});

export interface ModelDescriptor {
  id: string;
  name: string;
  provider: "openai" | "anthropic" | "google";
  tier: "fast" | "smart";
  description: string;
}

export const AVAILABLE_MODELS: ModelDescriptor[] = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    tier: "fast",
    description: "Fast, cost-efficient model for chat, explanations and queries",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    tier: "smart",
    description: "Flagship intelligence for complex coding, debugging and architecture",
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    tier: "fast",
    description: "Lightning fast responses with exceptional code reasoning",
  },
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    tier: "smart",
    description: "World-class coding, refactoring and structural diff generation",
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "google",
    tier: "fast",
    description: "Sub-second speed with large multimodal context window",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "google",
    tier: "smart",
    description: "Deep reasoning and extensive context processing",
  },
];

export function getAllowedModels(): ModelDescriptor[] {
  const allowlist = (env.AI_ALLOWED_MODELS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) {
    return AVAILABLE_MODELS;
  }

  return AVAILABLE_MODELS.filter((m) =>
    allowlist.includes(m.id.toLowerCase())
  );
}

export function getModelInstance(modelId?: string) {
  // If user has only Google or only Anthropic configured, adapt automatically
  const hasOpenAi = Boolean(openaiApiKey && openaiApiKey.startsWith("sk-"));
  const hasGoogle = Boolean(googleApiKey && googleApiKey.length > 5);
  const hasAnthropic = Boolean(env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.startsWith("sk-ant-"));

  let targetId = modelId || env.AI_MODEL_FAST || "gpt-4o-mini";

  if (!hasOpenAi && hasGoogle && !targetId.includes("gemini")) {
    targetId = "gemini-1.5-flash";
  } else if (!hasOpenAi && hasAnthropic && !targetId.includes("claude")) {
    targetId = "claude-3-5-haiku-20241022";
  }

  const descriptor = AVAILABLE_MODELS.find((m) => m.id === targetId) || AVAILABLE_MODELS[0];

  switch (descriptor.provider) {
    case "anthropic":
      return anthropic(descriptor.id);
    case "google":
      return google(descriptor.id);
    case "openai":
    default:
      return openai(descriptor.id);
  }
}

export function getSmartModel() {
  return getModelInstance(env.AI_MODEL_SMART || "gpt-4o");
}

export function getFastModel() {
  return getModelInstance(env.AI_MODEL_FAST || "gpt-4o-mini");
}
