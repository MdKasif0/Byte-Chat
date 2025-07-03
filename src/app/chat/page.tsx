"use client";

import { useState } from "react";
import Link from "next/link";
import { collection, query, where, orderBy } from "firebase/firestore";
import { Search, Pin, Check } from "lucide-react";
import { format } from "date-fns";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import type { Chat } from "@/lib/types";
import { useCollection } from "@/hooks/use-collection";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatPage() {
    const { user } = useAuth();

    // This would be populated with real data in a full implementation
    const onlineUsers: any[] = [];

    const chatsQuery = user ? query(
        collection(db, "chats"), 
        where("members", "array-contains", user.uid),
        orderBy("lastMessage.timestamp", "desc")
    ) : null;
    
    const { data: chats, loading } = useCollection<Chat>(chatsQuery);
    
  return (
    <div className="h-full flex flex-col bg-background">
        <header className="p-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Chat</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="rounded-full"><Search className="h-5 w-5" /></Button>
                    <Button className="rounded-full font-semibold">Subscribe</Button>
                </div>
            </div>
        </header>

        <main className="flex-grow px-4 space-y-8">
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-semibold">Online</h2>
                    <Link href="#" className="text-sm text-primary font-semibold">View All</Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
                    {onlineUsers.length > 0 ? onlineUsers.map((u: any) => (
                        <div key={u.name} className="flex flex-col items-center gap-2 shrink-0">
                            <div className="relative">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={u.avatar} alt={u.name} />
                                    <AvatarFallback>{u.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
                            </div>
                            <span className="text-sm font-medium">{u.name}</span>
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground w-full py-6 text-center">No users are online right now.</p>
                    )}
                </div>
            </section>
            
            <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-muted rounded-full h-12">
                    <TabsTrigger value="all" className="rounded-full">All</TabsTrigger>
                    <TabsTrigger value="groups" className="rounded-full">Groups</TabsTrigger>
                    <TabsTrigger value="contacts" className="rounded-full">Contacts</TabsTrigger>
                    <TabsTrigger value="archive" className="rounded-full">Archive</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-4">
                        <Pin className="h-4 w-4 -rotate-45" />
                        Pinned Chats
                    </h3>
                    <div className="space-y-1">
                        {loading ? (
                             Array.from({ length: 3 }).map((_, i) => <ChatSkeleton key={i} />)
                        ) : chats && chats.length > 0 ? (
                            chats.map((chat) => (
                                <ChatItem key={chat.id} chat={chat} currentUserId={user!.uid} />
                            ))
                        ) : (
                            <div className="text-center py-16 bg-muted/50 rounded-2xl">
                                <p className="font-semibold">No chats yet</p>
                                <p className="text-sm text-muted-foreground mt-1">Tap the + button to start a new conversation.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </main>
    </div>
  );
}

function ChatSkeleton() {
    return (
        <div className="flex items-center gap-4 p-3 rounded-2xl">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-grow space-y-2">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-48" />
            </div>
        </div>
    )
}

function ChatItem({ chat, currentUserId }: { chat: Chat, currentUserId: string }) {
    const otherMember = chat.memberProfiles.find(member => member.uid !== currentUserId);

    if (!otherMember) return null;
    
    // For design purposes, mock unread count for one user
    const unreadCount = otherMember.displayName === "Matthew Lucas" ? 3 : 0;

    return (
        <Link href={`/chat/${chat.id}`} className="block">
            <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted transition-colors">
                <div className="relative shrink-0">
                    <Avatar className="h-14 w-14">
                        <AvatarImage src={otherMember.photoURL} alt={otherMember.displayName} />
                        <AvatarFallback>{otherMember.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                     {otherMember.isOnline && <span className="absolute bottom-0.5 right-0.5 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />}
                </div>
                <div className="flex-grow overflow-hidden">
                    <div className="flex justify-between items-start">
                        <h4 className="font-semibold truncate">{otherMember.displayName}</h4>
                        {chat.lastMessage?.timestamp && (
                             <p className="text-xs text-muted-foreground shrink-0">
                                {format(chat.lastMessage.timestamp.toDate(), 'p')}
                            </p>
                        )}
                    </div>
                    <div className="flex justify-between items-start mt-1">
                        <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                           {chat.lastMessage?.senderId === currentUserId && <Check className="h-4 w-4" />} 
                           {chat.lastMessage?.content || "No messages yet."}
                        </p>
                        {unreadCount > 0 && (
                            <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    )
}
