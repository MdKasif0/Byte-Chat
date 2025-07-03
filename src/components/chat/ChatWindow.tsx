"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, onSnapshot } from "firebase/firestore";
import { Paperclip, Send, Phone, Video, MoreVertical, Smile, X, Users, Image as ImageIcon, FileText, Loader2, Mic, Camera, StopCircle, Trash2 } from "lucide-react";
import debounce from "lodash.debounce";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { useCollection } from "@/hooks/use-collection";
import { createMessage, setTypingStatus, markChatAsRead } from "@/lib/chat";
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

type ChatWindowProps = {
  chatId: string;
};

const messageSchema = z.object({
  content: z.string(),
});

type MessageFormData = z.infer<typeof messageSchema>;

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

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: messages, loading: messagesLoading } = useCollection<Message>(
    chatId ? `chats/${chatId}/messages` : null,
    { orderBy: ["timestamp", "asc"] }
  );

  const mediaMessages = messages?.filter(m => m.fileURL) || [];

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
    setIsUploading(false);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  }

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
    <MediaViewer
        isOpen={isMediaViewerOpen}
        setIsOpen={setMediaViewerOpen}
        mediaItems={mediaMessages}
        startIndex={mediaViewerStartIndex}
    />
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
                        onReply={setReplyTo}
                        onMediaClick={openMedia}
                    />
                ))
            ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground"><p>No messages yet. Start the conversation!</p></div>
            )}
        </div>
      </ScrollArea>

      <footer className="border-t p-2 md:p-4 bg-card space-y-2">
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
