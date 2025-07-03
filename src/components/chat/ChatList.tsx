"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { PlusCircle, Search } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import type { Chat } from "@/lib/types";
import { useCollection } from "@/hooks/use-collection";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInput,
  SidebarFooter
} from "@/components/ui/sidebar";
import NewChatDialog from "./NewChatDialog";
import UserNav from "./UserNav";
import { formatDistanceToNowStrict } from "date-fns";

export default function ChatList() {
    const { user } = useAuth();
    const pathname = usePathname();
    const [isNewChatDialogOpen, setNewChatDialogOpen] = useState(false);

    const chatsQuery = user ? query(
        collection(db, "chats"), 
        where("members", "array-contains", user.uid),
        orderBy("lastMessage.timestamp", "desc")
    ) : null;
    
    const { data: chats, loading } = useCollection<Chat>(chatsQuery);

    const getOtherMember = (chat: Chat) => {
        return chat.memberProfiles.find(member => member.uid !== user?.uid);
    }
    
  return (
    <>
      <SidebarHeader className="border-b">
        <div className="flex w-full items-center justify-between">
          <h1 className="text-xl font-bold font-headline">ByteChat</h1>
          <UserNav />
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <SidebarInput placeholder="Search chats..." className="pl-8" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading chats...</div>
          ) : chats && chats.length > 0 ? (
            <SidebarMenu>
              {chats.map((chat) => {
                const otherMember = getOtherMember(chat);
                if (!otherMember) return null;

                return (
                    <SidebarMenuItem key={chat.id}>
                        <SidebarMenuButton asChild className="h-auto p-2 w-full justify-start" size="lg" isActive={pathname === `/chat/${chat.id}`}>
                            <Link href={`/chat/${chat.id}`}>
                                <div className="relative">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={otherMember.photoURL} alt={otherMember.displayName} data-ai-hint="person" />
                                        <AvatarFallback>{otherMember.displayName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    {otherMember.isOnline && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />}
                                </div>
                                <div className="flex-grow text-left overflow-hidden">
                                    <div className="flex justify-between items-center">
                                    <span className="font-semibold truncate">{otherMember.displayName}</span>
                                    {chat.lastMessage?.timestamp && (
                                        <span className="text-xs text-muted-foreground shrink-0">
                                            {formatDistanceToNowStrict(chat.lastMessage.timestamp.toDate())}
                                        </span>
                                    )}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {chat.lastMessage?.content || "No messages yet"}
                                    </p>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No chats yet. Start a new conversation!
            </div>
          )}
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="outline" className="w-full justify-start" onClick={() => setNewChatDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Chat
        </Button>
      </SidebarFooter>
      <NewChatDialog open={isNewChatDialogOpen} onOpenChange={setNewChatDialogOpen} />
    </>
  );
}
