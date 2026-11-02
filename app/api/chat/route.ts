import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { auth } from "@/lib/auth";
import { getModelInstance, getFastModel } from "@/lib/ai/models";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { webSearchTool } from "@/lib/ai/tools";
import { checkRateLimit } from "@/lib/ratelimit";
import { saveMessage, getMessages, updateConversation, getUserById } from "@/lib/db/queries";
import { z } from "zod";

export const maxDuration = 60;
export const runtime = "nodejs";

const chatRequestSchema = z.object({
  id: z.string().optional(),
  conversationId: z.string().min(1),
  messages: z.array(
    z.object({
      id: z.string().optional(),
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
  model: z.string().optional(),
  webSearch: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id || "dev-user-001";

  // Rate limiting (30 messages per minute)
  const rateLimit = await checkRateLimit("chat", userId);
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `Too many chat messages. Please wait ${Math.ceil(
            (rateLimit.reset - Date.now()) / 1000
          )} seconds before sending another message.`,
        },
      },
      { status: 429 }
    );
  }

  try {
    const json = await req.json();
    const parsed = chatRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { conversationId, messages: incomingMessages, model, webSearch } = parsed.data;

    // Fetch user preferences
    const user = await getUserById(userId);
    const prefs = user?.preferences || {};

    // Get last user message
    const latestUserMsg = incomingMessages[incomingMessages.length - 1];
    if (latestUserMsg && latestUserMsg.role === "user") {
      await saveMessage({
        conversationId,
        role: "user",
        parts: [{ type: "text", text: latestUserMsg.content }],
      });
    }

    const systemPrompt = buildSystemPrompt({
      responseStyle: prefs.responseStyle || "detailed",
      customInstructions: prefs.customInstructions,
      memory: prefs.memory ? "Active workspace: NOVA AI Coding Platform." : undefined,
    });

    const modelInstance = getModelInstance(model);

    // Call streamText
    const result = streamText({
      model: modelInstance,
      system: systemPrompt,
      messages: incomingMessages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      tools: webSearch ? { webSearch: webSearchTool } : undefined,
      maxSteps: 5,
      onFinish: async ({ text, usage }) => {
        try {
          await saveMessage({
            conversationId,
            role: "assistant",
            parts: [{ type: "text", text }],
            model,
            inputTokens: usage?.promptTokens || 0,
            outputTokens: usage?.completionTokens || 0,
          });

          // Check if title generation is needed
          const allMsgs = await getMessages(conversationId);
          if (allMsgs.length <= 2 && latestUserMsg?.content) {
            const shortTitle =
              latestUserMsg.content.slice(0, 35).replace(/[\r\n]+/g, " ").trim() +
              (latestUserMsg.content.length > 35 ? "..." : "");
            await updateConversation(conversationId, userId, { title: shortTitle });
          }
        } catch (saveErr) {
          console.error("Failed to persist finished assistant message:", saveErr);
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (err: any) {
    console.error("Chat streaming route error:", err);
    return NextResponse.json(
      {
        error: {
          code: "AI_ERROR",
          message: err?.message || "An error occurred while streaming response from AI provider.",
        },
      },
      { status: 500 }
    );
  }
}
