import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { auth } from "@/lib/auth";
import { getModelInstance, getFastModel } from "@/lib/ai/models";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { webSearchTool } from "@/lib/ai/tools";
import { checkRateLimit } from "@/lib/ratelimit";
import { saveMessage, getMessages, updateConversation, getUserById } from "@/lib/db/queries";
import { env } from "@/lib/env";
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

    const hasApiKey = Boolean(
      (env.OPENAI_API_KEY && env.OPENAI_API_KEY.startsWith("sk-")) ||
      env.ANTHROPIC_API_KEY ||
      env.GOOGLE_GENERATIVE_AI_API_KEY
    );

    if (!hasApiKey) {
      // Local development fallback streaming response when no API key is yet configured
      const demoResponse = `Hello! I am **NOVA**, your AI coding companion.

I am currently running in **Local Preview Mode** because no external AI provider API key is set in \`.env.local\`.

Here is a verified sample solution to demonstrate code execution and IDE integration:

\`\`\`python
# High-performance QuickSort in Python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

numbers = [38, 27, 43, 3, 9, 82, 10]
print("Original array:", numbers)
print("Sorted array:  ", quicksort(numbers))
\`\`\`

### Complexity Analysis
- **Time Complexity**: $\\mathcal{O}(n \\log n)$ average case, $\\mathcal{O}(n^2)$ worst-case.
- **Auxiliary Space**: $\\mathcal{O}(\\log n)$ recursion stack.

> [!TIP]
> You can click **"Run"** above to execute this code in the sandbox immediately, or click **"Open in editor"** to view and debug it in the Monaco IDE!
> To enable live GPT-4o, Claude 3.5, or Gemini streaming, add your \`OPENAI_API_KEY="sk-..."\` to \`.env.local\`.

<!-- SUGGESTIONS: ["Can you optimize this code further?", "Add unit tests for edge cases", "Open this algorithm in the IDE"] -->`;

      const encoder = new TextEncoder();
      const words = demoResponse.split(" ");
      let wordIdx = 0;

      const customStream = new ReadableStream({
        async start(controller) {
          const interval = setInterval(async () => {
            if (wordIdx < words.length) {
              const chunk = (wordIdx > 0 ? " " : "") + words[wordIdx];
              controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
              wordIdx++;
            } else {
              clearInterval(interval);
              controller.close();

              try {
                await saveMessage({
                  conversationId,
                  role: "assistant",
                  parts: [{ type: "text", text: demoResponse }],
                  model: "preview-model",
                  inputTokens: 50,
                  outputTokens: 250,
                });
                if (latestUserMsg?.content) {
                  const shortTitle =
                    latestUserMsg.content.slice(0, 35).replace(/[\r\n]+/g, " ").trim() +
                    (latestUserMsg.content.length > 35 ? "..." : "");
                  await updateConversation(conversationId, userId, { title: shortTitle });
                }
              } catch (saveErr) {
                // ignore
              }
            }
          }, 35);
        },
      });

      return new Response(customStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Vercel-AI-Data-Stream": "v1",
        },
      });
    }

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
