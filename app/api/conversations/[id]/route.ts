import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getConversation,
  getMessages,
  updateConversation,
  deleteConversation,
} from "@/lib/db/queries";
import { z } from "zod";

export const runtime = "nodejs";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId = session?.user?.id || (process.env.NODE_ENV !== "production" ? "dev-user-001" : null);
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 }
    );
  }

  const conversation = await getConversation(params.id, userId);
  if (!conversation) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Conversation not found" } },
      { status: 404 }
    );
  }

  const messagesList = await getMessages(params.id);

  return NextResponse.json({
    conversation,
    messages: messagesList,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId = session?.user?.id || (process.env.NODE_ENV !== "production" ? "dev-user-001" : null);
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 }
    );
  }

  try {
    const json = await req.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const updated = await updateConversation(params.id, userId, parsed.data);
    if (!updated) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Conversation not found or update failed" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: err?.message || "Failed to update conversation" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId = session?.user?.id || (process.env.NODE_ENV !== "production" ? "dev-user-001" : null);
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 }
    );
  }

  const success = await deleteConversation(params.id, userId);
  return NextResponse.json({ success });
}
