import { ChatView } from "@/components/chat/chat-view";
import { getMessages } from "@/lib/db/queries";

export default async function ExistingChatPage({
  params,
}: {
  params: { id: string };
}) {
  const dbMessages = await getMessages(params.id);
  const initialMessages = dbMessages.map((m: any) => ({
    id: m.id,
    role: m.role as "user" | "assistant" | "system",
    content:
      typeof m.parts === "string"
        ? m.parts
        : m.parts?.[0]?.text || (Array.isArray(m.parts) ? JSON.stringify(m.parts) : ""),
    createdAt: m.createdAt,
  }));

  return <ChatView conversationId={params.id} initialMessages={initialMessages} />;
}
