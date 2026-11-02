import { ChatView } from "@/components/chat/chat-view";
import { nanoid } from "nanoid";

export default function NewChatPage() {
  const newConversationId = `conv-${Date.now()}`;
  return <ChatView conversationId={newConversationId} />;
}
