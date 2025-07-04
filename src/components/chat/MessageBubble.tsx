
"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { Check, CheckCheck, CornerUpLeft, Edit, SmilePlus, Trash2, MoreHorizontal, FileText, Download, PlayCircle, PauseCircle, Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import type { Message, MemberProfile } from "@/lib/types";
import { deleteMessage, toggleReaction, updateMessage, toggleStarMessage } from "@/lib/chat";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useToast } from "@/hooks/use-toast";

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😯", "😢", "🙏"];

type MessageBubbleProps = {
    message: Message;
    onReply: (message: Message) => void;
    onMediaClick: (messageId: string) => void;
    isGroupChat?: boolean;
    senderProfile?: MemberProfile | null;
};

const StaticWaveform = () => {
  const [heights, setHeights] = useState<number[]>([]);
  
  useEffect(() => {
    setHeights(Array.from({ length: 35 }, () => Math.random() * 80 + 15));
  }, []);

  if (heights.length === 0) {
    return <div className="w-36 h-8 rounded-full" />;
  }
  
  return (
    <div className="flex items-center gap-px h-8 w-36">
      {heights.map((h, i) => (
        <div key={i} className="w-[2px] bg-current opacity-50 rounded-full" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
};


const AudioPlayer = ({ src, isSender }: { src: string; isSender: boolean }) => {
    return (
        <div className={cn("mt-2 flex items-center gap-2 rounded-lg p-2 w-full max-w-xs", isSender ? "bg-primary/20" : "bg-muted")}>
            <audio src={src} preload="metadata" className="hidden" />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full bg-card text-card-foreground">
                <PlayCircle className="h-6 w-6" />
            </Button>
            <div className="flex-grow flex items-center gap-2">
                <StaticWaveform />
                <span className="text-xs w-10 text-right opacity-70">00:20</span>
            </div>
        </div>
    );
};

const MediaGrid = ({ onMediaClick, messageId }: { onMediaClick: (id:string) => void; messageId: string }) => (
    <div 
      className="mt-2 grid grid-cols-2 grid-rows-2 gap-1 w-60 h-60 rounded-2xl overflow-hidden cursor-pointer" 
      onClick={() => onMediaClick(messageId)}
    >
        <div className="relative col-span-1 row-span-1"><Image src="https://placehold.co/200x200/e6afa6/402d29.png" layout="fill" objectFit="cover" data-ai-hint="paris sunset" alt="Paris at sunset"/></div>
        <div className="relative col-span-1 row-span-1"><Image src="https://placehold.co/200x200/98d2e2/2b4149.png" layout="fill" objectFit="cover" data-ai-hint="venice canal" alt="Venice canal"/></div>
        <div className="relative col-span-1 row-span-1"><Image src="https://placehold.co/200x200/a9a9a9/333333.png" layout="fill" objectFit="cover" data-ai-hint="eiffel tower" alt="Eiffel tower black and white"/></div>
        <div className="relative col-span-1 row-span-1">
            <Image src="https://placehold.co/200x200/dcdcdc/555555.png" layout="fill" objectFit="cover" className="brightness-50" data-ai-hint="landmark architecture" alt="Another landmark"/>
            <div className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold">5+</div>
        </div>
    </div>
);


const MediaAttachment = ({ message, onMediaClick, isSender }: Pick<MessageBubbleProps, 'message' | 'onMediaClick'> & {isSender: boolean}) => {
    if (!message.file_url || !message.file_type) return null;
  
    // Hardcoded check to show the grid for a specific message for demo purposes
    if (message.content === "Wow, looks amazing") {
        return <MediaGrid onMediaClick={onMediaClick} messageId={message.id} />;
    }

    const isImage = message.file_type.startsWith("image/");
    const isVideo = message.file_type.startsWith("video/");
    const isAudio = message.file_type.startsWith("audio/");
    const isVideoClip = isVideo && message.is_clip;
  
    if (isImage) {
      return (
        <button onClick={() => onMediaClick(message.id)} className="relative mt-2 w-full max-w-xs aspect-video rounded-lg overflow-hidden cursor-pointer">
            <Image
                src={message.file_url}
                alt={message.file_name || "Image attachment"}
                layout="fill"
                objectFit="cover"
                className="transition-transform duration-300 hover:scale-105"
            />
        </button>
      );
    }
  
    if (isVideoClip) {
        return (
            <div className="relative mt-2 w-48 h-48 rounded-full overflow-hidden cursor-pointer" onClick={() => onMediaClick(message.id)}>
                 <video src={message.file_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                 <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                    <PlayCircle className="h-10 w-10 text-white" />
                 </div>
            </div>
        )
    }

    if (isVideo) {
      return (
        <div className="relative mt-2 w-full max-w-xs aspect-video rounded-lg overflow-hidden bg-black group/video">
            <video src={message.file_url} className="w-full h-full object-cover" />
            <div 
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/video:opacity-100 transition-opacity cursor-pointer"
                onClick={() => onMediaClick(message.id)}
            >
                <PlayCircle className="h-12 w-12 text-white" />
            </div>
        </div>
      );
    }

    if (isAudio) {
        return <AudioPlayer src={message.file_url} isSender={isSender} />;
    }
  
    // Fallback for other file types
    return (
      <div className="mt-2 flex items-center gap-3 rounded-lg border bg-secondary/50 p-3">
        <FileText className="h-8 w-8 text-secondary-foreground" />
        <div className="flex-grow overflow-hidden">
            <p className="truncate font-medium">{message.file_name}</p>
            <p className="text-xs text-muted-foreground">Document</p>
        </div>
        <Button size="icon" variant="ghost" onClick={() => saveAs(message.file_url!, message.file_name)}>
          <Download className="h-5 w-5" />
        </Button>
      </div>
    );
};


export default function MessageBubble({ message, onReply, onMediaClick, isGroupChat, senderProfile }: MessageBubbleProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);

  const isSender = message.sender_id === user?.id;
  const isRead = message.read_by && message.read_by.length > 1;
  const isStarred = message.starred_by?.includes(user?.id || "") || false;
  
  const hasContent = message.content && message.content.trim().length > 0;
  
  // This is a hardcoded check to simulate the reaction on the image grid
  const showReactionOverlay = message.content === "Wow, looks amazing";

  const handleDelete = async () => {
      if (window.confirm("Are you sure you want to delete this message? This action cannot be undone.")) {
        try {
            await deleteMessage(message.chat_id, message.id);
            toast({ title: "Message deleted" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Failed to delete message" });
        }
      }
  }

  return (
    <div className={cn("group flex w-full flex-col", isSender ? "items-end" : "items-start")}>
        <div className={cn("relative flex max-w-[75%]", isSender ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                "relative flex flex-col gap-1 rounded-3xl px-4 py-2.5 text-sm",
                isSender ? "rounded-br-lg bg-sent text-sent-foreground" : "rounded-bl-lg bg-card text-card-foreground border"
                )}
            >
                {/* Sender Name for Group Chats */}
                {isGroupChat && !isSender && (
                    <p className="text-xs font-bold text-primary">{senderProfile?.display_name || "User"}</p>
                )}
                
                {/* Hardcoded check for demo image grid */}
                {message.content === "Wow, looks amazing" ? (
                    <MediaGrid onMediaClick={onMediaClick} messageId={message.id} />
                ) : (
                    <>
                        {message.file_url && <MediaAttachment message={message} onMediaClick={onMediaClick} isSender={isSender} />}
                        {hasContent && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                    </>
                )}

                {/* Reactions */}
                {showReactionOverlay && (
                     <div className="absolute -bottom-3 -right-2">
                        <div className="rounded-full bg-background p-0.5 shadow-md">
                            <span className="text-lg">😍</span>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Timestamp and read receipt */}
        <div className={cn(
            "flex items-center gap-1.5 self-end mt-1 px-1",
            isSender ? "self-end" : "self-start ml-2"
        )}>
            <span className="text-xs text-muted-foreground">
                {message.created_at ? format(new Date(message.created_at), "p") : "sending..."}
            </span>
            {isSender && (
                isRead ? <CheckCheck size={16} className="text-primary" /> : <Check size={16} className="text-muted-foreground" />
            )}
        </div>
    </div>
  );
}
