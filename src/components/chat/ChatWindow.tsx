"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, Send, Phone, Video, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

const messages: any[] = [];

type Chat = {
  id: string;
  name: string;
  avatar: string;
};

export default function ChatWindow({ chat }: { chat: Chat }) {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector("div");
        if(viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  return (
    <div className="flex h-full max-h-screen flex-col bg-card/50 md:rounded-xl overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b p-2 md:p-4 bg-card">
        <div className="flex items-center gap-2 md:gap-4">
          <Avatar>
            <AvatarImage src={chat.avatar} alt={chat.name} data-ai-hint="person portrait" />
            <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{chat.name}</h2>
            <p className="text-sm text-muted-foreground">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-4 h-full">
            {messages.length > 0 ? (
                messages.map((message) => (
                    <div
                    key={message.id}
                    className={cn(
                        "flex w-max max-w-[75%] flex-col gap-1 rounded-lg px-3 py-2 text-sm shadow-sm",
                        message.sender === 'me'
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-card border"
                    )}
                    >
                    <p>{message.content}</p>
                    <span className={cn(
                        "text-xs self-end",
                        message.sender === 'me' ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    )}>
                        {message.time}
                    </span>
                    </div>
                ))
            ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                    <p>No messages yet. Start the conversation!</p>
                </div>
            )}
        </div>
      </ScrollArea>

      <footer className="border-t p-2 md:p-4 bg-card">
        <form className="flex w-full items-center space-x-2">
          <Button variant="ghost" size="icon" type="button">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input id="message" placeholder="Type your message..." className="flex-1" autoComplete="off" />
          <Button type="submit" size="icon">
            <Send className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </footer>
    </div>
  );
}
