import { ChatView } from "@/components/chat/chat-view";

export default function ExistingChatPage({
  params,
}: {
  params: { id: string };
}) {
  return <ChatView conversationId={params.id} />;
}
