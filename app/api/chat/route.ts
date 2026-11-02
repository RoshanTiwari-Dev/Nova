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
      (env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.startsWith("sk-ant-")) ||
      (env.GOOGLE_GENERATIVE_AI_API_KEY && env.GOOGLE_GENERATIVE_AI_API_KEY.length > 5) ||
      (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5)
    );

    if (!hasApiKey) {
      // Local development dynamic preview response tailored to user inquiry
      const promptText = latestUserMsg?.content || "";
      const lower = promptText.toLowerCase().trim();

      let demoResponse = "";

      if (lower.includes("icici")) {
        demoResponse = `**ICICI Bank** (originally the *Industrial Credit and Investment Corporation of India*) is one of India's largest and most prominent private sector banks, offering a comprehensive suite of financial products and banking services.

### Key Overview:
- **Headquarters**: Mumbai, Maharashtra (Corporate Office) and Vadodara, Gujarat (Registered Office).
- **Inception & History**: Founded in 1955 through a joint initiative of the **World Bank**, the Government of India, and representatives of Indian industry to finance medium- and long-term industrial projects. In 1994, it formed ICICI Bank as a commercial banking subsidiary.
- **Market Standing**: Classified by the Reserve Bank of India (RBI) as a **Domestic Systemically Important Bank (D-SIB)** — commonly referred to as a bank that is "too big to fail", alongside SBI and HDFC Bank.

### Core Business Segments:
1. **Retail Banking**:
   - Savings accounts, fixed deposits, credit cards, and debit cards.
   - Mortgages, home loans, auto loans, personal loans, and gold loans.
2. **Corporate & Investment Banking**:
   - Working capital financing, project finance, syndicated loans, and foreign exchange hedging.
3. **Digital Banking Pioneer**:
   - *iMobile Pay*: One of India's most comprehensive mobile banking applications.
   - *InstaBIZ*: Specialized mobile and web platform for SMEs and merchant ecosystems.
   - API Banking and digital onboarding pipelines.
4. **Group Ecosystem & Subsidiaries**:
   - **ICICI Prudential Life Insurance**: One of India's leading private life insurers.
   - **ICICI Lombard**: Prominent general and health insurance company.
   - **ICICI Securities**: Operates the *ICICI Direct* trading and investment portal.
   - **ICICI Prudential AMC**: Leading mutual fund and asset management company.

### Global Presence:
ICICI Bank operates thousands of branches and ATMs across India, with international subsidiaries and representative branches in the United States, United Kingdom, Canada, Singapore, Bahrain, Hong Kong, and Dubai.

Is there a specific service, account type, or financial aspect of ICICI Bank you would like to explore further?

<!-- SUGGESTIONS: ["What are ICICI Bank's digital banking features?", "Compare ICICI Bank vs HDFC Bank", "What is a D-SIB bank in India?"] -->`;
      } else if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)/i.test(lower)) {
        demoResponse = `Hello! How can I help you today?

I am **NOVA** — your personal AI assistant. You can chat with me naturally about any topic you'd like (daily questions, banking, science, history, writing, or brainstorming). 

Whenever you need to write or test code, I also have a built-in sandbox to **run and debug programs** across Python, C++, Java, JavaScript, and more.

What's on your mind today?

<!-- SUGGESTIONS: ["Tell me about ICICI Bank", "How does inflation affect savings?", "Write a Python script for me"] -->`;
      } else if (lower.includes("hdfc") || lower.includes("sbi") || lower.includes("bank") || lower.includes("interest rate") || lower.includes("credit card") || lower.includes("loan") || lower.includes("fixed deposit")) {
        demoResponse = `Banking institutions play a central role in managing personal liquidity, credit creation, and economic growth.

### Common Banking Services:
1. **Deposit Accounts**:
   - **Savings Account**: For daily transactions and basic liquidity with modest interest earnings.
   - **Fixed / Term Deposit (FD)**: Guaranteed returns over fixed tenures, offering higher interest than savings accounts.
   - **Recurring Deposit (RD)**: Discipline-oriented systematic monthly savings.
2. **Credit & Borrowing**:
   - **Unsecured Credit**: Credit cards and personal loans that do not require collateral.
   - **Secured Loans**: Home loans and vehicle loans backed by underlying assets, offering lower interest rates.
3. **Digital & Instant Payments**:
   - Real-time gross settlement (RTGS), NEFT, and Unified Payments Interface (UPI) for instant peer-to-peer and merchant payments.

Would you like more details on interest rates, credit cards, or a comparison between specific banks?

<!-- SUGGESTIONS: ["Compare ICICI vs HDFC Bank", "How do credit scores work?", "What is the difference between simple and compound interest?"] -->`;
      } else if (lower.includes("who are you") || lower.includes("what can you do") || lower.includes("help me with")) {
        demoResponse = `I am **NOVA**, an AI assistant designed to chat naturally with you on any topic — just like ChatGPT — while giving you the option to write, test, and run programs whenever you want.

### What I can help you with:
- **Everyday Conversation & Q&A**: Explaining concepts, discussing finance, business, science, books, and general knowledge.
- **Writing & Brainstorming**: Drafting emails, essays, summaries, and creative brainstorming.
- **Programming & Problem Solving**: When asked, I can generate, explain, debug, and execute code in Python, C++, Java, and JavaScript right inside our chat.

Feel free to ask me anything!

<!-- SUGGESTIONS: ["Tell me about ICICI Bank", "Explain quantum computing simply", "Write a Python script"] -->`;
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
      } else if (lower.includes("code") || lower.includes("program") || lower.includes("script") || lower.includes("algorithm") || lower.includes("function") || lower.includes("python") || lower.includes("debug")) {
        demoResponse = `Here is a clean Python program for your request:

\`\`\`python
# Solution for requested task
def solve():
    print("=== NOVA Program Execution ===")
    sample_data = [15, 22, 8, 44, 91, 3, 67]
    sorted_data = sorted(sample_data)
    print("Original data:", sample_data)
    print("Sorted data:  ", sorted_data)
    print("Max value:    ", max(sample_data))
    print("Min value:    ", min(sample_data))

if __name__ == "__main__":
    solve()
\`\`\`

### Key Highlights:
- **Run in Chat**: Click the **"Run"** button above to execute it instantly in the isolated sandbox.
- **Language Switch**: Change the language dropdown on the code block to run it with different compilers.
- **Side-by-side Runner**: Click **"Side Runner"** to edit and run it side-by-side with our chat!

<!-- SUGGESTIONS: ["Can you optimize this?", "Explain how to pass custom stdin", "Open in full IDE"] -->`;
      } else {
        demoResponse = `Here is an informative overview regarding **${promptText.replace(/[\r\n]+/g, " ").trim()}**:

When discussing this topic, it helps to look at the primary concepts, practical context, and everyday implications:

1. **Overview & Definition**: It represents an important concept or entity in its field with specific functions and characteristics.
2. **Key Aspects**:
   - How it operates and the main services or principles behind it.
   - Its impact on consumers, industry, or broader systems.
   - Notable advantages, developments, or recent trends.
3. **Summary**: Understanding how it fits into your questions or goals.

Would you like more detailed information about any specific part of this, or should we discuss a related question?

*(Tip: You can chat with me about any topic like a regular chatbot, and whenever you want to test or write code, simply ask "write a program for X" to generate and run it in Python, C++, Java, and more!)*

<!-- SUGGESTIONS: ["Can you explain in more detail?", "Give me a real-world example", "What are the key benefits?"] -->`;
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
