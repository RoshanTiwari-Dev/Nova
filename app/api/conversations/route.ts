import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getConversations, createConversation } from "@/lib/db/queries";
import { z } from "zod";

export const runtime = "nodejs";

const createConversationSchema = z.object({
  title: z.string().min(1).max(200).default("New Conversation"),
  model: z.string().default("gpt-4o-mini"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id || (process.env.NODE_ENV !== "production" ? "dev-user-001" : null);
  if (!userId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } }, { status: 401 });
  }

  const list = await getConversations(userId);
  const searchParam = req.nextUrl.searchParams.get("q")?.toLowerCase();

  const filtered = searchParam
    ? list.filter((c) => c.title.toLowerCase().includes(searchParam))
    : list;

  return NextResponse.json({ conversations: filtered });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id || (process.env.NODE_ENV !== "production" ? "dev-user-001" : null);
  if (!userId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = createConversationSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const conv = await createConversation(
      userId,
      parsed.data.title,
      parsed.data.model
    );

    return NextResponse.json({ conversation: conv }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: err?.message || "Failed to create conversation" } },
      { status: 500 }
    );
  }
}
