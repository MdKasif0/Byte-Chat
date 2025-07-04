
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip, Send, Phone, Video, MoreVertical, Smile, X, Users, Image as ImageIcon, FileText, Loader2, Mic, Camera, StopCircle, Trash2, Bell, BellOff, Wallpaper, Search, ArrowLeft, ArrowUp } from "lucide-react";
import debounce from "lodash.debounce";
import { format, isToday, isYesterday } from "date-fns";

import { useAuth } from "@/context/AuthContext";
import { useRealtimeQuery } from "@/hooks/use-realtime-query";
import { createMessage, setTypingStatus, markChatAsRead, toggleMuteChat } from "@/lib/chat";
import type { Chat, Message, UserProfile, MemberProfile, CallType } from "@/lib/types";
import { uploadFile } from "@/lib/storage";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageBubble from "./MessageBubble";
import { Skeleton } from "../ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import GroupInfoDialog from "./GroupInfoDialog";
import MediaViewer from "./MediaViewer";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import WallpaperDialog from "./WallpaperDialog";
import CallContainer from "./calls/CallContainer";
import { createClient } from "@/lib/supabase/client";

type ChatWindowProps = {
  chatId: string;
};

const messageSchema = z.object({
  content: z.string(),
});

type MessageFormData = z.infer<typeof messageSchema>;

type CallRequest = {
    type: CallType,
    calleeId: string,
}

const MESSAGES_PER_PAGE = 50;

const DateSeparator = ({ date }: { date: Date }) => {
  let label = format(date, "PPP");
  if (isToday(date)) label = "Today";
  if (isYesterday(date)) label = "Yesterday";

  return (
    <div className="flex items-center justify-center my-4">
      <div className="text-xs text-muted-foreground font-semibold bg-background px-3 py-1 rounded-full">{label}</div>
    </div>
  );
};

export default function ChatWindow({ chatId }: ChatWindowProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [chat, setChat] = useState<Chat | null>(null);
  const [otherUser, setOtherUser] = useState<MemberProfile | null>(null);
  const [otherUserProfile, setOtherUserProfile] = useState<UserProfile | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isGroupInfoOpen, setGroupInfoOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [isMediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewerStartIndex, setMediaViewerStartIndex] = useState(0);

  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording'>('idle');
  const [recordingType, setRecordingType] = useState<'audio' | 'video' | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [isWallpaperDialogOpen, setWallpaperDialogOpen] = useState(false);

  const [msgLimit, setMsgLimit] = useState(MESSAGES_PER_PAGE);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const [callRequest, setCallRequest] = useState<CallRequest | null>(null);


  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { data: messagesDesc, loading: messagesLoading } = useRealtimeQuery<Message>({
    table: 'messages',
    primaryKey: 'id',
    filter: { column: 'chat_id', operator: 'eq', value: chatId },
    orderBy: { column: 'created_at', options: { ascending: false } },
  });

  const messages = useMemo(() => messagesDesc?.slice().reverse() || [], [messagesDesc]);
  const mediaMessages = useMemo(() => messages?.filter(m => m.file_url) || [], [messages]);

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: "" },
  });
  
  useEffect(() => {
    // Reset state when chat changes
    setIsInitialLoad(true);
    setMsgLimit(MESSAGES_PER_PAGE);
  }, [chatId]);

  useEffect(() => {
    // Check if there are more messages to load
    if (messagesDesc) {
        setHasMore(messagesDesc.length === msgLimit);
    }
  }, [messagesDesc, msgLimit]);

  useEffect(() => {
    if (!chatId || !user) return;
    
    const fetchChatData = async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();
      
      if (error || !data) {
        console.error('Error fetching chat data:', error);
        router.push('/chat');
        return;
      }
      
      setChat(data as Chat);

      if (!data.is_group) {
        const otherMember = data.member_profiles.find((m: MemberProfile) => m.id !== user.id) || null;
        setOtherUser(otherMember);
      } else {
        setOtherUser(null);
      }
      markChatAsRead(chatId, user.id);
    };

    fetchChatData();

    const channel = supabase.channel(`chat-${chatId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'chats',
            filter: `id=eq.${chatId}`
        }, (payload) => {
            const updatedChat = payload.new as Chat;
            setChat(updatedChat);
             if (!updatedChat.is_group) {
                const otherMember = updatedChat.member_profiles.find((m: MemberProfile) => m.id !== user?.id) || null;
                setOtherUser(otherMember);
            }
        })
        .subscribe();
    
    return () => {
        supabase.removeChannel(channel);
    }

  }, [chatId, user, supabase, router]);

  useEffect(() => {
    if (!otherUser?.id) {
        setOtherUserProfile(null);
        return;
    };

    const fetchOtherUserProfile = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherUser.id)
            .single();
        if (error) {
            console.error("Error fetching other user's profile:", error);
        } else {
            setOtherUserProfile(data as UserProfile);
        }
    };

    fetchOtherUserProfile();

    const channel = supabase.channel(`profile-${otherUser.id}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${otherUser.id}`
        }, (payload) => {
            setOtherUserProfile(payload.new as UserProfile);
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    }
  }, [otherUser, supabase]);


  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector("div");
    if (viewport && isInitialLoad && messages && messages.length > 0 && !messagesLoading) {
        viewport.scrollTop = viewport.scrollHeight;
        setIsInitialLoad(false);
    }
  }, [isInitialLoad, messages, messagesLoading]);

  const debouncedSetTypingStatus = useCallback(
    debounce((isTyping: boolean) => {
      if (chatId && user) {
        setTypingStatus(chatId, user.id, isTyping);
      }
    }, 500),
    [chatId, user]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue("content", e.target.value);
    if (e.target.value) {
      debouncedSetTypingStatus(true);
      debouncedSetTypingStatus.flush();
      setTimeout(() => debouncedSetTypingStatus(false), 3000);
    } else {
        debouncedSetTypingStatus(false);
        debouncedSetTypingStatus.cancel();
    }
  };
  
  const onSubmit = async (data: MessageFormData) => {
    if (!user || !chatId || (!data.content && !selectedFile)) return;
    setIsUploading(true);

    let fileInfo: { url: string; name: string; type: string; isClip?: boolean; } | undefined;

    if (selectedFile) {
      const isClip = selectedFile.name.includes('_clip.');
      const downloadURL = await uploadFile(selectedFile, chatId);
      fileInfo = {
        url: downloadURL,
        name: selectedFile.name,
        type: selectedFile.type,
        isClip: isClip,
      };
    }

    await createMessage(chatId, user.id, data.content, replyTo, fileInfo);
    
    form.reset();
    setReplyTo(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    debouncedSetTypingStatus(false);
    debouncedSetTypingStatus.cancel();
    
    const viewport = scrollAreaRef.current?.querySelector("div");
    if (viewport) {
      setTimeout(() => viewport.scrollTop = viewport.scrollHeight, 100);
    }
    
    setIsUploading(false);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  }

  const loadMoreMessages = () => {
    if (!messagesLoading) {
        setMsgLimit(prev => prev + MESSAGES_PER_PAGE);
    }
  };

  const startRecording = async (type: 'audio' | 'video') => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: type === 'video' ? { facingMode: 'user' } : false,
        });

        setMediaStream(stream);
        setRecordingStatus('recording');
        setRecordingType(type);
        recordedChunksRef.current = [];

        const mimeType = type === 'video' ? 'video/webm;codecs=vp8,opus' : 'audio/webm;codecs=opus';
        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data);
            }
        };

        recorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: mimeType });
            const file = new File([blob], `${type}_clip.${mimeType.split('/')[1].split(';')[0]}`, { type: mimeType });
            setSelectedFile(file);
        };
        
        recorder.start();
        
        recordingIntervalRef.current = setInterval(() => {
            setRecordingSeconds(prev => prev + 1);
        }, 1000);

    } catch (err) {
        console.error("Error accessing media devices.", err);
        toast({
            variant: 'destructive',
            title: "Permission Denied",
            description: `Could not access your ${type}. Please check your browser settings.`
        })
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingStatus === 'recording') {
        mediaRecorderRef.current.stop();
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);

    setRecordingStatus('idle');
    setRecordingSeconds(0);
    setRecordingType(null);
    setMediaStream(null);
  };

  const cancelRecording = () => {
    stopRecording();
    setSelectedFile(null);
    recordedChunksRef.current = [];
  }

  const getSenderProfile = (senderId: string) => {
    return chat?.member_profiles.find(p => p.id === senderId);
  }

  const openMedia = (messageId: string) => {
    const index = mediaMessages.findIndex(m => m.id === messageId);
    if (index > -1) {
        setMediaViewerStartIndex(index);
        setMediaViewerOpen(true);
    }
  }

  const typingUsers = chat?.typing?.filter(uid => uid !== user?.id)
    .map(uid => chat.member_profiles.find(p => p.id === uid)?.display_name)
    .filter(Boolean) || [];

  const isMuted = user && chat?.muted_by?.includes(user.id);

  const handleToggleMute = async () => {
      if (!user || !chat) return;
      try {
          await toggleMuteChat(chat.id, user.id, !isMuted);
          toast({
              title: isMuted ? "Notifications Unmuted" : "Notifications Muted",
              description: `You will ${isMuted ? 'now' : 'no longer'} receive notifications for this chat.`,
          });
      } catch (error) {
          toast({
              variant: "destructive",
              title: "Error",
              description: "Could not update notification settings."
          })
      }
  }

  const handleStartCall = (type: CallType) => {
      if (chat?.is_group) {
          toast({ title: "Group calls are not supported yet." });
          return;
      }
      if (otherUser) {
          setCallRequest({ type, calleeId: otherUser.id });
      }
  }
  
  const messagesByDate = useMemo(() => {
    return messages.reduce((acc, msg) => {
        const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(msg);
        return acc;
    }, {} as Record<string, Message[]>);
  }, [messages]);

  if (!chat || (!otherUser && !chat.is_group)) {
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

  const isOnline = otherUserProfile?.is_online;
  const statusDisplay = chat.is_group
    ? `${chat.members.length} members`
    : (isOnline ? 'Online' : 'Offline');
  const isStatusOnline = statusDisplay === 'Online';
  
  const headerDetails = {
    name: chat.is_group ? chat.group_name : (otherUserProfile?.display_name || otherUser?.display_name),
    avatarUrl: chat.is_group ? chat.group_avatar_url : (otherUserProfile?.photo_url || otherUser?.photo_url),
    status: statusDisplay
  }
  
  const typingText = `${typingUsers.slice(0, 2).join(', ')}${typingUsers.length > 2 ? ' and others' : ''} are typing...`;
  const isSendDisabled = form.formState.isSubmitting || isUploading || (!form.getValues("content") && !selectedFile);
  const hasTextContent = !!form.watch("content");

  return (
    <>
    {chat && <GroupInfoDialog isOpen={isGroupInfoOpen} setIsOpen={setGroupInfoOpen} chat={chat} />}
    {chat && <WallpaperDialog isOpen={isWallpaperDialogOpen} onOpenChange={setWallpaperDialogOpen} chatId={chat.id} />}
    <MediaViewer
        isOpen={isMediaViewerOpen}
        setIsOpen={setMediaViewerOpen}
        mediaItems={mediaMessages}
        startIndex={mediaViewerStartIndex}
    />
    <div
        className={cn(
            "flex h-full max-h-screen flex-col md:rounded-xl overflow-hidden bg-center bg-cover transition-all",
            !chat.wallpaper_url && "bg-background"
        )}
        style={{
            backgroundImage: chat.wallpaper_url ? `url(${chat.wallpaper_url})` : undefined,
        }}
    >
      <header className="flex shrink-0 items-center justify-between border-b p-2 md:p-4 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.back()}><ArrowLeft /></Button>
            <Avatar className="border-2 border-background">
                <AvatarImage src={headerDetails.avatarUrl || undefined} alt={headerDetails.name || ""} data-ai-hint="person portrait" />
                <AvatarFallback>{chat.is_group ? <Users /> : headerDetails.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <h2 className="text-lg font-semibold">{headerDetails.name}</h2>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground h-5">
                    {isStatusOnline && !chat.is_group && <div className="h-2 w-2 rounded-full bg-green-500" />}
                    <AnimatePresence>
                    {typingUsers.length > 0 ? (
                        <motion.p key="typing" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="text-primary">{typingText}</motion.p>
                    ) : (
                        <motion.p key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{headerDetails.status}</motion.p>
                    )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
            {!chat.is_group && (
                <>
                    <Button variant="ghost" size="icon" className="rounded-full bg-muted" onClick={() => handleStartCall('video')}><Video className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="icon" className="rounded-full bg-muted" onClick={() => handleStartCall('audio')}><Phone className="h-5 w-5" /></Button>
                </>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full bg-muted"><MoreVertical className="h-5 w-5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {chat.is_group ? (
                        <DropdownMenuItem onSelect={() => setGroupInfoOpen(true)}>Group Details</DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem>View Contact</DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => toast({ title: "Coming Soon!", description: "In-chat search is under development."})}>
                        <Search className="mr-2 h-4 w-4" /> Search
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setWallpaperDialogOpen(true)}>
                        <Wallpaper className="mr-2 h-4 w-4" /> Wallpaper
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleToggleMute}>
                        {isMuted ? (
                            <><Bell className="mr-2 h-4 w-4" /> Unmute</>
                        ) : (
                            <><BellOff className="mr-2 h-4 w-4" /> Mute</>
                        )}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>
      
      <div className="p-4 pt-0">
            <div className="flex items-center justify-between rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm">
                <p className="font-medium">You have 04:42 min left</p>
                <Button variant="link" className="text-primary-foreground font-bold hover:text-primary-foreground/80 h-auto p-0">Subscribe</Button>
            </div>
        </div>

      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-2 h-full">
            {messagesLoading && messages?.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground"><p>Loading messages...</p></div>
            ) : (
                <>
                {hasMore && (
                    <div className="text-center my-4">
                        <Button variant="secondary" onClick={loadMoreMessages} disabled={messagesLoading}>
                            {messagesLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : "Load Older Messages"}
                        </Button>
                    </div>
                )}
                {Object.keys(messagesByDate).length > 0 ? (
                    Object.entries(messagesByDate).map(([date, dateMessages]) => (
                        <React.Fragment key={date}>
                             <DateSeparator date={new Date(date)} />
                            {dateMessages.map(message => (
                                <MessageBubble 
                                    key={message.id} 
                                    message={message}
                                    isGroupChat={chat.is_group} 
                                    senderProfile={getSenderProfile(message.sender_id)}
                                    onReply={setReplyTo}
                                    onMediaClick={openMedia}
                                />
                            ))}
                        </React.Fragment>
                    ))
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-muted-foreground bg-background/50 backdrop-blur-sm p-2 rounded-lg">No messages yet. Start the conversation!</p>
                    </div>
                )}
                </>
            )}
        </div>
      </ScrollArea>

      <footer className="border-t p-2 md:p-4 bg-background/80 backdrop-blur-sm space-y-2">
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full items-center space-x-2">
            <div className="flex w-full items-center gap-2 rounded-full bg-muted p-1">
                <Button variant="ghost" size="icon" type="button" className="rounded-full"><Smile className="h-6 w-6 text-muted-foreground" /></Button>
                <Input 
                    {...form.register("content")}
                    placeholder="Type something.." 
                    className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base h-10" 
                    autoComplete="off"
                    onChange={handleInputChange} 
                />
                 <Button variant="ghost" size="icon" type="button" className="rounded-full"><Mic className="h-6 w-6 text-muted-foreground" /></Button>
                 <Button type="submit" size="icon" disabled={isSendDisabled} className="rounded-full bg-primary h-10 w-10 shrink-0 text-primary-foreground">
                    {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
                    <span className="sr-only">Send message</span>
                </Button>
            </div>
        </form>
      </footer>
       {user && chat && (
          <CallContainer
            user={user as UserProfile}
            chat={chat}
            callRequest={callRequest}
            onCallEnded={() => setCallRequest(null)}
          />
       )}
    </div>
    </>
  );
}
