import ChatWindow from "@/components/chat/ChatWindow";

export default function ChatConversationPage({ params }: { params: { chatId: string } }) {
  // In a real app, you would fetch chat details based on params.chatId
  const chatDetails = {
    id: params.chatId,
    name: params.chatId === '1' ? 'Alice' : params.chatId === '2' ? 'Group Chat' : params.chatId === '3' ? 'Bob' : 'Charlie',
    avatar: 'https://placehold.co/40x40.png'
  };

  return <ChatWindow chat={chatDetails} />;
}
