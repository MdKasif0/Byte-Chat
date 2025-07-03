import { MessagesSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-card/50 md:rounded-xl">
      <MessagesSquare className="h-16 w-16 text-muted-foreground" />
      <h2 className="mt-4 text-2xl font-semibold text-center font-headline">
        Welcome to Cryptochat
      </h2>
      <p className="mt-2 text-muted-foreground text-center">
        Select a chat from the sidebar to start messaging.
      </p>
    </div>
  );
}
