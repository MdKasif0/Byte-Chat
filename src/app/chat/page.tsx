"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, query, where, orderBy } from "firebase/firestore";
import { Search, Check, Users, File, Video, Image as ImageIcon, Mic, MessagesSquare } from "lucide-react";
import { format } from "date-fns";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import type { Chat, UserProfile, Message } from "@/lib/types";
import { useCollection } from "@/hooks/use-collection";
import { useToast } from "@/hooks/use-toast";
import { createChat } from "@/lib/chat";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const chatsQuery = user ? query(
        collection(db, "chats"), 
        where("members", "array-contains", user.uid),
        orderBy("lastMessage.timestamp", "desc")
    ) : null;
    
    const { data: chats, loading: chatsLoading } = useCollection<Chat>(chatsQuery);

    const usersQuery = user ? query(
        collection(db, "users"),
        where("uid", "!=", user.uid)
    ) : null;
    
    const { data: users, loading: usersLoading } = useCollection<UserProfile>(usersQuery);
    
    const handleStartChat = async (targetUserId: string) => {
        if (!user) {
          toast({ variant: "destructive", title: "You must be logged in." });
          return;
        }
    
        try {
          const chatId = await createChat(user.uid, targetUserId);
          router.push(`/chat/${chatId}`);
        } catch (error) {
          console.error("Error creating chat:", error);
          toast({ variant: "destructive", title: "Failed to start chat." });
        }
      };

  return (
    <div className="h-full flex flex-col bg-background">
        <header className="p-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Chat</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="rounded-full"><Search className="h-5 w-5" /></Button>
                </div>
            </div>
        </header>

        <main className="flex-grow px-4 space-y-8">
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-semibold">Start a chat</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
                    {usersLoading ? (
                        Array.from({ length: 5 }).map((_, i) => <UserSkeleton key={i} />)
                    ) : users && users.length > 0 ? (
                        users.map((u: UserProfile) => (
                            <button key={u.uid} onClick={() => handleStartChat(u.uid)} className="flex flex-col items-center gap-2 shrink-0 text-center w-20">
                                <div className="relative">
                                    <Avatar className="h-16 w-16">
                                        <AvatarImage src={u.photoURL} alt={u.displayName} />
                                        <AvatarFallback>{u.displayName?.[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    {u.isOnline && <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />}
                                </div>
                                <span className="text-sm font-medium truncate w-full">{u.displayName}</span>
                            </button>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground w-full py-6 text-center">No other users found.</p>
                    )}
                </div>
            </section>
            
            <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-4">
                    <MessagesSquare className="h-4 w-4" />
                    Recent Chats
                </h3>
                <div className="space-y-1">
                    {chatsLoading ? (
                         Array.from({ length: 3 }).map((_, i) => <ChatSkeleton key={i} />)
                    ) : chats && chats.length > 0 ? (
                        chats.map((chat) => (
                            <ChatItem key={chat.id} chat={chat} currentUserId={user!.uid} />
                        ))
                    ) : (
                        <div className="text-center py-16 bg-muted/50 rounded-2xl">
                            <p className="font-semibold">No chats yet</p>
                            <p className="text-sm text-muted-foreground mt-1">Start a conversation with someone from above!</p>
                        </div>
                    )}
                </div>
            </section>
        </main>
    </div>
  );
}

function UserSkeleton() {
    return (
        <div className="flex flex-col items-center gap-2 shrink-0">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-12" />
        </div>
    )
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

function LastMessagePreview({ lastMessage, currentUserId }: { lastMessage: Message, currentUserId: string }) {
    if (!lastMessage) return <p className="text-sm text-muted-foreground truncate">No messages yet.</p>;

    const wasSentByMe = lastMessage.senderId === currentUserId;
    let preview: React.ReactNode;

    if (lastMessage.fileURL) {
        if (lastMessage.fileType?.startsWith('image/')) {
            preview = <><ImageIcon className="h-4 w-4 mr-1" />Photo</>;
        } else if (lastMessage.fileType?.startsWith('video/')) {
            preview = <><Video className="h-4 w-4 mr-1" />Video</>;
        } else if (lastMessage.fileType?.startsWith('audio/')) {
            preview = <><Mic className="h-4 w-4 mr-1" />Voice message</>;
        } else {
            preview = <><File className="h-4 w-4 mr-1" />{lastMessage.fileName || 'File'}</>;
        }
    } else {
        preview = lastMessage.content || "No messages yet.";
    }

    return (
        <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
            {wasSentByMe && <Check className="h-4 w-4" />} 
            {preview}
        </p>
    );
}

function ChatItem({ chat, currentUserId }: { chat: Chat, currentUserId: string }) {
    const isGroup = chat.isGroup;
    const otherMember = !isGroup ? chat.memberProfiles.find(member => member.uid !== currentUserId) : null;

    if (!isGroup && !otherMember) return null;
    
    // For design purposes, mock unread count for one user
    const unreadCount = otherMember?.displayName === "Matthew Lucas" ? 3 : 0;

    const displayName = isGroup ? chat.groupName : otherMember?.displayName;
    const photoURL = isGroup ? chat.groupAvatarURL : otherMember?.photoURL;
    const isOnline = !isGroup && otherMember?.isOnline;

    return (
        <Link href={`/chat/${chat.id}`} className="block">
            <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted transition-colors">
                <div className="relative shrink-0">
                    <Avatar className="h-14 w-14">
                        <AvatarImage src={photoURL} alt={displayName} />
                        <AvatarFallback>
                            {isGroup ? <Users className="h-6 w-6"/> : displayName?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                     {isOnline && <span className="absolute bottom-0.5 right-0.5 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />}
                </div>
                <div className="flex-grow overflow-hidden">
                    <div className="flex justify-between items-start">
                        <h4 className="font-semibold truncate">{displayName}</h4>
                        {chat.lastMessage?.timestamp && (
                             <p className="text-xs text-muted-foreground shrink-0">
                                {format(chat.lastMessage.timestamp.toDate(), 'p')}
                            </p>
                        )}
                    </div>
                    <div className="flex justify-between items-start mt-1">
                       {chat.lastMessage ? <LastMessagePreview lastMessage={chat.lastMessage} currentUserId={currentUserId} /> : <p className="text-sm text-muted-foreground truncate">No messages yet.</p>}
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
