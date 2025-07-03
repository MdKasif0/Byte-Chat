import ChatWindow from "@/components/chat/ChatWindow";

export default function ChatConversationPage({ params }: { params: { chatId: string } }) {
  return <ChatWindow chatId={params.chatId} />;
}
