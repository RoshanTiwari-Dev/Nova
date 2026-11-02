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
      // Local development dynamic preview response tailored to user inquiry
      const promptText = latestUserMsg?.content || "";
      const lower = promptText.toLowerCase().trim();

      let demoResponse = "";

      if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)/i.test(lower)) {
        demoResponse = `Hello! How can I help you today?

I am **NOVA** — you can chat with me just like ChatGPT about anything you'd like (general questions, concepts, writing, math), plus you have the superpower to **write and run different programs** across Python, C++, Java, JavaScript, and more!

What would you like to explore or build today?

<!-- SUGGESTIONS: ["Write a Python script for me", "Explain how binary search works", "Run a C++ program"] -->`;
      } else if (lower.includes("c++") || lower.includes("cpp")) {
        demoResponse = `Here is a complete, runnable **C++** program for you:

\`\`\`cpp
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    cout << "=== NOVA C++ Program Execution ===" << endl;
    vector<string> languages = {"Python", "C++", "Java", "JavaScript", "Rust"};
    
    cout << "Available sandbox languages:" << endl;
    for (size_t i = 0; i < languages.size(); ++i) {
        cout << "  [" << (i + 1) << "] " << languages[i] << endl;
    }

    sort(languages.begin(), languages.end());
    cout << "\\nSorted alphabetically:" << endl;
    for (const auto& lang : languages) {
        cout << "  • " << lang << endl;
    }

    return 0;
}
\`\`\`

> [!TIP]
> You can click **"Run"** directly above to execute this C++ program in the sandbox, or click **"Side Runner"** to test it side-by-side with our chat!

<!-- SUGGESTIONS: ["Can you optimize this code?", "Explain line by line", "Add custom stdin input"] -->`;
      } else if (lower.includes("java")) {
        demoResponse = `Here is a complete, runnable **Java** program:

\`\`\`java
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        System.out.println("=== NOVA Java Sandbox Runner ===");
        
        List<String> items = new ArrayList<>();
        items.add("Algorithms");
        items.add("Data Structures");
        items.add("Object-Oriented Design");
        items.add("Memory Management");

        System.out.println("Topics loaded:");
        for (int i = 0; i < items.size(); i++) {
            System.out.printf("  (%d) %s%n", i + 1, items.get(i));
        }

        Collections.sort(items);
        System.out.println("\\nSorted list: " + items);
    }
}
\`\`\`

> [!TIP]
> Click **"Run"** above to compile and run this Java class right in the chat!

<!-- SUGGESTIONS: ["Convert this to Python", "Add custom stdin", "Explain time complexity"] -->`;
      } else if (lower.includes("javascript") || lower.includes("js") || lower.includes("node")) {
        demoResponse = `Here is a runnable **JavaScript (Node.js)** program:

\`\`\`javascript
// NOVA JavaScript Sandbox Runner
function computeStatistics(numbers) {
  const sum = numbers.reduce((a, b) => a + b, 0);
  const avg = sum / numbers.length;
  const max = Math.max(...numbers);
  const min = Math.min(...numbers);
  return { count: numbers.length, sum, average: avg, max, min };
}

const sampleData = [12, 45, 68, 23, 89, 90, 3, 56];
console.log("Input data:", sampleData);
console.log("Calculated metrics:", computeStatistics(sampleData));
\`\`\`

> [!TIP]
> Click **"Run"** above to execute this in the Node.js sandbox, or click **"Side Runner"** to tweak the numbers!

<!-- SUGGESTIONS: ["Convert to TypeScript", "Explain line by line", "Add async operations"] -->`;
      } else {
        demoResponse = `Here is a helpful solution to your request:

\`\`\`python
# NOVA Multi-Language Program Runner
def main():
    print("=== NOVA Program Execution ===")
    user_query = """${promptText.replace(/"""/g, '\\"\\"\\"').slice(0, 80)}"""
    print(f"Processing task: {user_query}")
    
    # Demonstration of computation in sandbox
    results = [x**2 for x in range(1, 11)]
    print("Computed squared sequence:", results)
    print("Execution completed successfully with exit code 0.")

if __name__ == "__main__":
    main()
\`\`\`

### Summary & Explanation:
- **Run in Chat**: You can click **"Run"** on the code block above to execute it immediately in the isolated sandbox.
- **Switch Languages**: You can change the language dropdown on the code block to run it with different compilers (C++, Java, JavaScript, Python, etc.).
- **Side-by-side Runner**: Click **"Side Runner"** or the top toolbar button to open the live interactive compiler right beside our chat.

*(Tip: To enable live GPT-4o / Claude 3.5 streaming, add your \`OPENAI_API_KEY="sk-..."\` to \`.env.local\`)*

<!-- SUGGESTIONS: ["Run this in C++", "Explain how to pass custom stdin", "Can you optimize this?"] -->`;
      }

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
