
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusCircle, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

import { useAuth } from "@/context/AuthContext";
import type { Chat } from "@/lib/types";

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
    const supabase = createClient();
    const [isNewChatDialogOpen, setNewChatDialogOpen] = useState(false);
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchChats = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('chats')
                .select('*')
                .contains('members', [user.id])
                .order('last_message->>created_at', { ascending: false, nullsFirst: false });
            
            if (data) setChats(data as Chat[]);
            if (error) console.error("Error fetching chats for list:", error);
            setLoading(false);
        };
        fetchChats();

        const channel = supabase.channel('public:chats-list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chats', filter: `members.cs.{"${user.id}"}` }, fetchChats)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, supabase]);

    const getOtherMember = (chat: Chat) => {
        return chat.member_profiles.find(member => member.id !== user?.id);
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
                                        <AvatarImage src={otherMember.photo_url} alt={otherMember.display_name} data-ai-hint="person" />
                                        <AvatarFallback>{otherMember.display_name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    {otherMember.is_online && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />}
                                </div>
                                <div className="flex-grow text-left overflow-hidden">
                                    <div className="flex justify-between items-center">
                                    <span className="font-semibold truncate">{otherMember.display_name}</span>
                                    {chat.last_message?.created_at && (
                                        <span className="text-xs text-muted-foreground shrink-0">
                                            {formatDistanceToNowStrict(new Date(chat.last_message.created_at))}
                                        </span>
                                    )}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {chat.last_message?.content || "No messages yet"}
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
