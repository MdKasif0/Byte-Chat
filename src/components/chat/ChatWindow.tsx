"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, onSnapshot } from "firebase/firestore";
import { Paperclip, Send, Phone, Video, MoreVertical, Smile, X, Users } from "lucide-react";
import debounce from "lodash.debounce";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { useCollection } from "@/hooks/use-collection";
import { createMessage, setTypingStatus, markChatAsRead } from "@/lib/chat";
import type { Chat, Message, UserProfile, MemberProfile } from "@/lib/types";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageBubble from "./MessageBubble";
import { Skeleton } from "../ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import GroupInfoDialog from "./GroupInfoDialog";

type ChatWindowProps = {
  chatId: string;
};

const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty."),
});

type MessageFormData = z.infer<typeof messageSchema>;

export default function ChatWindow({ chatId }: ChatWindowProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [chat, setChat] = useState<Chat | null>(null);
  const [otherUser, setOtherUser] = useState<MemberProfile | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isGroupInfoOpen, setGroupInfoOpen] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: messages, loading: messagesLoading } = useCollection<Message>(
    chatId ? `chats/${chatId}/messages` : null,
    { orderBy: ["timestamp", "asc"] }
  );

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: "" },
  });

  useEffect(() => {
    if (!chatId || !user) return;
    const unsub = onSnapshot(doc(db, "chats", chatId), (doc) => {
      if (doc.exists()) {
        const chatData = { id: doc.id, ...doc.data() } as Chat;
        setChat(chatData);
        if (!chatData.isGroup) {
          setOtherUser(chatData.memberProfiles.find(m => m.uid !== user.uid) || null);
        } else {
          setOtherUser(null);
        }
        markChatAsRead(chatId, user.uid);
      } else {
        router.push("/chat");
      }
    });
    return () => unsub();
  }, [chatId, user, router]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector("div");
        if(viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const debouncedSetTypingStatus = useCallback(
    debounce((isTyping: boolean) => {
      if (chatId && user) {
        setTypingStatus(chatId, user.uid, isTyping);
      }
    }, 500),
    [chatId, user]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue("content", e.target.value);
    debouncedSetTypingStatus(true);
    debouncedSetTypingStatus.flush();
    setTimeout(() => debouncedSetTypingStatus(false), 3000);
  };
  
  const onSubmit = async (data: MessageFormData) => {
    if (!user || !chatId) return;

    await createMessage(chatId, user.uid, data.content, replyTo);
    
    form.reset();
    setReplyTo(null);
    debouncedSetTypingStatus(false);
    debouncedSetTypingStatus.cancel();
  };

  const getSenderProfile = (senderId: string) => {
    return chat?.memberProfiles.find(p => p.uid === senderId);
  }

  const typingUsers = chat?.typing.filter(uid => uid !== user?.uid)
    .map(uid => chat.memberProfiles.find(p => p.uid === uid)?.displayName)
    .filter(Boolean) || [];

  const typingText = typingUsers.length > 0
    ? `${typingUsers.slice(0, 2).join(', ')}${typingUsers.length > 2 ? ' and others' : ''} are typing...`
    : (otherUser?.isOnline ? 'Online' : 'Offline');

  if (!chat || (!otherUser && !chat.isGroup)) {
    return (
      <div className="flex h-full flex-col bg-card/50 md:rounded-xl">
        <header className="flex shrink-0 items-center justify-between border-b p-2 md:p-4 bg-card">
          <div className="flex items-center gap-2 md:gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </header>
        <div className="flex-1 p-4" />
      </div>
    )
  }

  const headerDetails = {
    name: chat.isGroup ? chat.groupName : otherUser?.displayName,
    avatarUrl: chat.isGroup ? chat.groupAvatarURL : otherUser?.photoURL,
    status: chat.isGroup ? `${chat.members.length} members` : (otherUser?.isOnline ? 'Online' : 'Offline')
  }

  return (
    <>
    {chat && <GroupInfoDialog isOpen={isGroupInfoOpen} setIsOpen={setGroupInfoOpen} chat={chat} />}
    <div className="flex h-full max-h-screen flex-col bg-card/50 md:rounded-xl overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b p-2 md:p-4 bg-card">
        <div className="flex items-center gap-2 md:gap-4">
          <Avatar>
            <AvatarImage src={headerDetails.avatarUrl} alt={headerDetails.name} data-ai-hint="person portrait" />
            <AvatarFallback>{chat.isGroup ? <Users /> : headerDetails.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{headerDetails.name}</h2>
            <div className="text-sm text-muted-foreground h-5">
              <AnimatePresence>
                {typingUsers.length > 0 ? (
                  <motion.p key="typing" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="text-primary">{typingText}</motion.p>
                ) : (
                   <motion.p key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={otherUser?.isOnline ? 'text-green-500' : ''}>{headerDetails.status}</motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          {!chat.isGroup && (
            <>
                <Button variant="ghost" size="icon"><Video className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon"><Phone className="h-5 w-5" /></Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {chat.isGroup ? (
                    <DropdownMenuItem onSelect={() => setGroupInfoOpen(true)}>Group Details</DropdownMenuItem>
                ) : (
                    <DropdownMenuItem>View Contact</DropdownMenuItem>
                )}
                 <DropdownMenuItem>Search</DropdownMenuItem>
                 <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-2 h-full">
            {messagesLoading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground"><p>Loading messages...</p></div>
            ) : messages && messages.length > 0 ? (
                messages.map((message) => (
                   <MessageBubble 
                        key={message.id} 
                        message={message}
                        isGroupChat={chat.isGroup} 
                        senderProfile={getSenderProfile(message.senderId)}
                        onReply={setReplyTo} />
                ))
            ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground"><p>No messages yet. Start the conversation!</p></div>
            )}
        </div>
      </ScrollArea>

      <footer className="border-t p-2 md:p-4 bg-card space-y-2">
        {replyTo && (
            <div className="flex items-center justify-between rounded-md bg-secondary p-2 text-sm">
                <div className="border-l-2 border-primary pl-2 overflow-hidden">
                    <p className="font-semibold text-primary">Replying to {replyTo.senderId === user?.uid ? 'yourself' : getSenderProfile(replyTo.senderId)?.displayName}</p>
                    <p className="truncate text-muted-foreground">{replyTo.content}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setReplyTo(null)}><X className="h-4 w-4" /></Button>
            </div>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full items-center space-x-2">
          <Button variant="ghost" size="icon" type="button"><Smile className="h-5 w-5" /></Button>
          <Input 
            {...form.register("content")}
            placeholder="Type your message..." 
            className="flex-1" 
            autoComplete="off"
            onChange={handleInputChange} 
          />
          <Button type="submit" size="icon" disabled={form.formState.isSubmitting}>
            <Send className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </footer>
    </div>
    </>
  );
}
