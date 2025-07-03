
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, onSnapshot, collection, query, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { Paperclip, Send, Phone, Video, MoreVertical, Smile, X, Users, Image as ImageIcon, FileText, Loader2, Mic, Camera, StopCircle, Trash2, Bell, BellOff, Wallpaper, Search } from "lucide-react";
import debounce from "lodash.debounce";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { useCollection } from "@/hooks/use-collection";
import { createMessage, setTypingStatus, markChatAsRead, toggleMuteChat } from "@/lib/chat";
import type { Chat, Message, UserProfile, MemberProfile } from "@/lib/types";
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

type ChatWindowProps = {
  chatId: string;
};

const messageSchema = z.object({
  content: z.string(),
});

type MessageFormData = z.infer<typeof messageSchema>;

const MESSAGES_PER_PAGE = 25;

export default function ChatWindow({ chatId }: ChatWindowProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
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

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const messagesQuery = useMemo(() => (
    chatId ? query(
        collection(db, "chats", chatId, "messages"),
        orderBy("timestamp", "desc"),
        firestoreLimit(msgLimit)
    ) : null
  ), [chatId, msgLimit]);

  const { data: messagesDesc, loading: messagesLoading } = useCollection<Message>(messagesQuery);
  const messages = useMemo(() => messagesDesc?.slice().reverse() || [], [messagesDesc]);
  const mediaMessages = useMemo(() => messages?.filter(m => m.fileURL) || [], [messages]);

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
    const unsub = onSnapshot(doc(db, "chats", chatId), (doc) => {
      if (doc.exists()) {
        const chatData = { id: doc.id, ...doc.data() } as Chat;
        setChat(chatData);
        if (!chatData.isGroup) {
          const otherMember = chatData.memberProfiles.find(m => m.uid !== user.uid) || null;
          setOtherUser(otherMember);
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
    if (otherUser?.uid) {
        const unsub = onSnapshot(doc(db, "users", otherUser.uid), (userDoc) => {
            if (userDoc.exists()) {
                setOtherUserProfile(userDoc.data() as UserProfile);
            }
        });
        return () => unsub();
    }
  }, [otherUser]);

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
        setTypingStatus(chatId, user.uid, isTyping);
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
      const downloadURL = await uploadFile(selectedFile, `chat-files/${chatId}`);
      fileInfo = {
        url: downloadURL,
        name: selectedFile.name,
        type: selectedFile.type,
        isClip: isClip,
      };
    }

    await createMessage(chatId, user.uid, data.content, replyTo, fileInfo);
    
    form.reset();
    setReplyTo(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    debouncedSetTypingStatus(false);
    debouncedSetTypingStatus.cancel();
    
    const viewport = scrollAreaRef.current?.querySelector("div");
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
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
    return chat?.memberProfiles.find(p => p.uid === senderId);
  }

  const openMedia = (messageId: string) => {
    const index = mediaMessages.findIndex(m => m.id === messageId);
    if (index > -1) {
        setMediaViewerStartIndex(index);
        setMediaViewerOpen(true);
    }
  }

  const typingUsers = chat?.typing.filter(uid => uid !== user?.uid)
    .map(uid => chat.memberProfiles.find(p => p.uid === uid)?.displayName)
    .filter(Boolean) || [];

  const isMuted = chat?.mutedBy?.includes(user!.uid);

  const handleToggleMute = async () => {
      if (!user || !chat) return;
      try {
          await toggleMuteChat(chat.id, user.uid, !isMuted);
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

  const isOnline = otherUserProfile?.isOnline;
  const statusDisplay = chat.isGroup
    ? `${chat.members.length} members`
    : otherUserProfile?.status || (isOnline ? 'Online' : 'Offline');
  const isStatusOnline = statusDisplay === 'Online';
  
  const headerDetails = {
    name: chat.isGroup ? chat.groupName : (otherUserProfile?.displayName || otherUser?.displayName),
    avatarUrl: chat.isGroup ? chat.groupAvatarURL : (otherUserProfile?.photoURL || otherUser?.photoURL),
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
            !chat.wallpaperURL && "bg-background"
        )}
        style={{
            backgroundImage: chat.wallpaperURL ? `url(${chat.wallpaperURL})` : undefined,
        }}
    >
      <header className="flex shrink-0 items-center justify-between border-b p-2 md:p-4 bg-card/80 backdrop-blur-sm">
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
                   <motion.p key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={isStatusOnline && !chat.isGroup ? 'text-green-500' : ''}>{headerDetails.status}</motion.p>
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
                 <DropdownMenuItem onSelect={() => toast({ title: "Coming Soon!", description: "In-chat search is under development."})}>
                    <Search className="mr-2 h-4 w-4" /> Search
                 </DropdownMenuItem>
                 <DropdownMenuItem onSelect={() => setWallpaperDialogOpen(true)}>
                    <Wallpaper className="mr-2 h-4 w-4" /> Wallpaper
                </DropdownMenuItem>
                 <DropdownMenuItem onSelect={handleToggleMute}>
                    {isMuted ? (
                        <><Bell className="mr-2 h-4 w-4" /> Unmute Notifications</>
                    ) : (
                        <><BellOff className="mr-2 h-4 w-4" /> Mute Notifications</>
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ScrollArea className="flex-1 bg-black/10" ref={scrollAreaRef}>
        <div className="p-4 space-y-2 h-full">
            {messagesLoading && messages?.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground"><p>Loading messages...</p></div>
            ) : (
                <>
                {hasMore && (
                    <div className="text-center my-4">
                        <Button
                            variant="secondary"
                            onClick={loadMoreMessages}
                            disabled={messagesLoading}
                        >
                            {messagesLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading...
                                </>
                            ) : "Load Older Messages"}
                        </Button>
                    </div>
                )}
                {messages && messages.length > 0 ? (
                    messages.map((message) => (
                    <MessageBubble 
                            key={message.id} 
                            message={message}
                            isGroupChat={chat.isGroup} 
                            senderProfile={getSenderProfile(message.senderId)}
                            onReply={setReplyTo}
                            onMediaClick={openMedia}
                        />
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

      <footer className="border-t p-2 md:p-4 bg-card/80 backdrop-blur-sm space-y-2">
        <AnimatePresence>
        {selectedFile && recordingStatus === 'idle' && (
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="relative flex items-center justify-between rounded-md bg-secondary p-2 text-sm"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {selectedFile.type.startsWith('image/') ? (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    ) : selectedFile.type.startsWith('video/') ? (
                        <Video className="h-5 w-5 text-muted-foreground" />
                    ) : selectedFile.type.startsWith('audio/') ? (
                        <Mic className="h-5 w-5 text-muted-foreground" />
                    ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                    <p className="truncate text-muted-foreground">{selectedFile.name}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ""; }}><X className="h-4 w-4" /></Button>
            </motion.div>
        )}

        {replyTo && (
            <div className="flex items-center justify-between rounded-md bg-secondary p-2 text-sm">
                <div className="border-l-2 border-primary pl-2 overflow-hidden">
                    <p className="font-semibold text-primary">Replying to {replyTo.senderId === user?.uid ? 'yourself' : getSenderProfile(replyTo.senderId)?.displayName}</p>
                    <p className="truncate text-muted-foreground">{replyTo.content || "Attachment"}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setReplyTo(null)}><X className="h-4 w-4" /></Button>
            </div>
        )}
        </AnimatePresence>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full items-center space-x-2">
         {recordingStatus === 'recording' ? (
             <>
                <Button variant="ghost" size="icon" type="button" onClick={cancelRecording}><Trash2 className="h-5 w-5 text-destructive" /></Button>
                <div className="flex-1 flex items-center justify-center gap-2 font-mono text-red-500">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    {new Date(recordingSeconds * 1000).toISOString().substr(14, 5)}
                </div>
                <Button type="button" size="icon" onClick={stopRecording}>
                    <StopCircle className="h-6 w-6 text-primary" />
                </Button>
             </>
         ) : (
            <>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                <Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()}><Paperclip className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" type="button" onClick={() => startRecording('video')}><Camera className="h-5 w-5" /></Button>
                <Input 
                    {...form.register("content")}
                    placeholder="Type your message..." 
                    className="flex-1" 
                    autoComplete="off"
                    onChange={handleInputChange} 
                />
                <Button type={hasTextContent || selectedFile ? 'submit' : 'button'} size="icon" disabled={isSendDisabled && hasTextContent} onClick={!hasTextContent ? () => startRecording('audio') : undefined}>
                    {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : (hasTextContent || selectedFile ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />)}
                    <span className="sr-only">Send message</span>
                </Button>
            </>
         )}
        </form>
      </footer>
    </div>
    </>
  );
}
