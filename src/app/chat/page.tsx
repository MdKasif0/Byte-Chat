
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Check, Users, File, Video, Image as ImageIcon, Mic, MessagesSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo, useCallback, useEffect } from "react";
import debounce from "lodash.debounce";
import { createClient } from "@/lib/supabase/client";

import { useAuth } from "@/context/AuthContext";
import type { Chat, UserProfile, Message } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { createChat } from "@/lib/chat";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

export default function ChatPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const supabase = createClient();
    const [searchTerm, setSearchTerm] = useState("");
    
    const [chats, setChats] = useState<Chat[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [chatsLoading, setChatsLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        
        const fetchChats = async () => {
            setChatsLoading(true);
            const { data, error } = await supabase
                .from('chats')
                .select('*')
                .contains('members', [user.id])
                .order('last_message->>created_at', { ascending: false, nullsFirst: false });
            
            if (data) setChats(data as Chat[]);
            if (error) console.error("Error fetching chats", error);
            setChatsLoading(false);
        };
        fetchChats();

        const chatChannel = supabase.channel('public:chats-page')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chats', filter: `members.cs.{"${user.id}"}` }, fetchChats)
            .subscribe();

        return () => {
            supabase.removeChannel(chatChannel);
        };
    }, [user, supabase]);

    useEffect(() => {
        if (!user) return;

        const fetchUsers = async () => {
            setUsersLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id);
            
            if (data) setUsers(data as UserProfile[]);
            if (error) console.error("Error fetching users", error);
            setUsersLoading(false);
        };
        fetchUsers();

        const usersChannel = supabase.channel('public:profiles')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchUsers)
            .subscribe();

        return () => {
            supabase.removeChannel(usersChannel);
        };
    }, [user, supabase]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const debouncedSearchHandler = useCallback(debounce(handleSearchChange, 300), []);

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        if (!searchTerm) return users;
        return users.filter(u =>
            u.display_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const filteredChats = useMemo(() => {
        if (!chats) return [];
        if (!searchTerm) return chats;
        return chats.filter(chat => {
            if (chat.is_group) {
                return chat.group_name?.toLowerCase().includes(searchTerm.toLowerCase());
            }
            const otherMember = chat.member_profiles.find(member => member.id !== user!.id);
            return otherMember?.display_name.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [chats, searchTerm, user]);

    const handleStartChat = async (targetUserId: string) => {
        if (!user) {
          toast({ variant: "destructive", title: "You must be logged in." });
          return;
        }
    
        try {
          const chatId = await createChat(user.id, targetUserId);
          router.push(`/chat/${chatId}`);
        } catch (error) {
          console.error("Error creating chat:", error);
          toast({ variant: "destructive", title: "Failed to start chat." });
        }
    };
    
    const isLoading = chatsLoading || usersLoading;

  return (
    <div className="h-full flex flex-col bg-background">
        <header className="p-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Chat</h1>
            </div>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search for people or chats..."
                    className="pl-10"
                    onChange={debouncedSearchHandler}
                />
            </div>
        </header>

        <main className="flex-grow px-4 space-y-8">
            {isLoading ? (
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : searchTerm ? null : (
                 <section>
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-semibold">Start a chat</h2>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
                        {users && users.length > 0 ? (
                            users.map((u: UserProfile) => (
                                <button key={u.id} onClick={() => handleStartChat(u.id)} className="flex flex-col items-center gap-2 shrink-0 text-center w-20">
                                    <div className="relative">
                                        <Avatar className="h-16 w-16">
                                            <AvatarImage src={u.photo_url} alt={u.display_name} />
                                            <AvatarFallback>{u.display_name?.[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        {u.is_online && <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />}
                                    </div>
                                    <span className="text-sm font-medium truncate w-full">{u.display_name}</span>
                                </button>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground w-full py-6 text-center">No other users found.</p>
                        )}
                    </div>
                </section>
            )}
            
            <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-4">
                    <MessagesSquare className="h-4 w-4" />
                    {searchTerm ? "Search Results" : "Recent Chats"}
                </h3>
                <div className="space-y-1">
                    {filteredChats.length > 0 ? (
                        filteredChats.map((chat) => (
                            <ChatItem key={chat.id} chat={chat} currentUserId={user!.id} />
                        ))
                    ) : (
                        <div className="text-center py-16 bg-muted/50 rounded-2xl">
                            <p className="font-semibold">{searchTerm ? "No results found" : "No chats yet"}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {searchTerm ? "Try a different search term." : "Start a conversation with someone from above!"}
                            </p>
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

    const wasSentByMe = lastMessage.sender_id === currentUserId;
    let preview: React.ReactNode;

    if (lastMessage.file_url) {
        if (lastMessage.file_type?.startsWith('image/')) {
            preview = <><ImageIcon className="h-4 w-4 mr-1" />Photo</>;
        } else if (lastMessage.file_type?.startsWith('video/')) {
            preview = <><Video className="h-4 w-4 mr-1" />Video</>;
        } else if (lastMessage.file_type?.startsWith('audio/')) {
            preview = <><Mic className="h-4 w-4 mr-1" />Voice message</>;
        } else {
            preview = <><File className="h-4 w-4 mr-1" />{lastMessage.file_name || 'File'}</>;
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
    const isGroup = chat.is_group;
    const otherMember = !isGroup ? chat.member_profiles.find(member => member.id !== currentUserId) : null;

    if (!isGroup && !otherMember) return null;
    
    // For design purposes, mock unread count for one user
    const unreadCount = 0;

    const displayName = isGroup ? chat.group_name : otherMember?.display_name;
    const photoURL = isGroup ? chat.group_avatar_url : otherMember?.photo_url;
    const isOnline = !isGroup && otherMember?.is_online;

    return (
        <Link href={`/chat/${chat.id}`} className="block">
            <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted transition-colors">
                <div className="relative shrink-0">
                    <Avatar className="h-14 w-14">
                        <AvatarImage src={photoURL || undefined} alt={displayName || ''} />
                        <AvatarFallback>
                            {isGroup ? <Users className="h-6 w-6"/> : displayName?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                     {isOnline && <span className="absolute bottom-0.5 right-0.5 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />}
                </div>
                <div className="flex-grow overflow-hidden">
                    <div className="flex justify-between items-start">
                        <h4 className="font-semibold truncate">{displayName}</h4>
                        {chat.last_message?.created_at && (
                             <p className="text-xs text-muted-foreground shrink-0">
                                {format(new Date(chat.last_message.created_at), 'p')}
                            </p>
                        )}
                    </div>
                    <div className="flex justify-between items-start mt-1">
                       {chat.last_message ? <LastMessagePreview lastMessage={chat.last_message} currentUserId={currentUserId} /> : <p className="text-sm text-muted-foreground truncate">No messages yet.</p>}
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
