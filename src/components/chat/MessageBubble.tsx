"use client";

import React, { useState } from "react";
import Image from "next/image";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { Check, CheckCheck, CornerUpLeft, Edit, SmilePlus, Trash2, MoreHorizontal, FileText, Download, PlayCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import type { Message, MemberProfile } from "@/lib/types";
import { deleteMessage, toggleReaction, updateMessage } from "@/lib/chat";
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
  senderProfile?: MemberProfile;
};

const MediaAttachment = ({ message, onMediaClick }: Pick<MessageBubbleProps, 'message' | 'onMediaClick'>) => {
    if (!message.fileURL || !message.fileType) return null;
  
    const isImage = message.fileType.startsWith("image/");
    const isVideo = message.fileType.startsWith("video/");
  
    if (isImage) {
      return (
        <button onClick={() => onMediaClick(message.id)} className="relative mt-2 w-full max-w-xs aspect-video rounded-lg overflow-hidden cursor-pointer">
            <Image
                src={message.fileURL}
                alt={message.fileName || "Image attachment"}
                layout="fill"
                objectFit="cover"
                className="transition-transform duration-300 hover:scale-105"
            />
        </button>
      );
    }
  
    if (isVideo) {
      return (
        <div className="relative mt-2 w-full max-w-xs aspect-video rounded-lg overflow-hidden bg-black group/video">
            <video src={message.fileURL} className="w-full h-full object-cover" />
            <div 
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/video:opacity-100 transition-opacity cursor-pointer"
                onClick={() => onMediaClick(message.id)}
            >
                <PlayCircle className="h-12 w-12 text-white" />
            </div>
        </div>
      );
    }
  
    // Fallback for other file types
    return (
      <div className="mt-2 flex items-center gap-3 rounded-lg border bg-secondary/50 p-3">
        <FileText className="h-8 w-8 text-secondary-foreground" />
        <div className="flex-grow overflow-hidden">
            <p className="truncate font-medium">{message.fileName}</p>
            <p className="text-xs text-muted-foreground">Document</p>
        </div>
        <Button size="icon" variant="ghost" onClick={() => saveAs(message.fileURL!, message.fileName)}>
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

  const isSender = message.senderId === user?.uid;
  const isRead = message.readBy.length > 1;

  const handleReaction = async (emoji: string) => {
    if (!user) return;
    await toggleReaction(message.chatId, message.id, emoji, user.uid);
  };
  
  const handleEdit = async () => {
      if (editedContent.trim() === '' || editedContent === message.content) {
          setIsEditing(false);
          return;
      }
      try {
        await updateMessage(message.chatId, message.id, editedContent);
        setIsEditing(false);
        toast({ title: "Message updated" });
      } catch (error) {
        toast({ variant: 'destructive', title: "Failed to update message" });
      }
  }
  
  const handleDelete = async () => {
      if (window.confirm("Are you sure you want to delete this message? This action cannot be undone.")) {
        try {
            await deleteMessage(message.chatId, message.id);
            toast({ title: "Message deleted" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Failed to delete message" });
        }
      }
  }

  return (
    <div className={cn("group flex w-full", isSender ? "justify-end" : "justify-start")}>
      <div className={cn("flex items-end gap-2 max-w-[75%]", isSender && "flex-row-reverse")}>
        <div
            className={cn(
            "relative flex flex-col gap-1 rounded-lg px-3 py-2 text-sm shadow-sm",
            isSender ? "rounded-br-none bg-primary text-primary-foreground" : "rounded-bl-none bg-card border"
            )}
        >
             {/* Sender Name for Group Chats */}
            {isGroupChat && !isSender && (
                <p className="text-xs font-bold text-primary">{senderProfile?.displayName || "User"}</p>
            )}

             {/* Reply block */}
            {message.replyTo && (
                <div className="mb-1 rounded-md bg-black/20 p-2 text-xs">
                    <p className="font-bold">{message.replyTo.senderName}</p>
                    <p className="truncate">{message.replyTo.content || "Attachment"}</p>
                </div>
            )}
            
            {message.fileURL && <MediaAttachment message={message} onMediaClick={onMediaClick} />}

            {/* Message content */}
            {isEditing ? (
                <div className="flex gap-2">
                    <Input 
                        value={editedContent} 
                        onChange={(e) => setEditedContent(e.target.value)} 
                        className="h-8 bg-background text-foreground"
                        onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                    />
                    <Button size="sm" onClick={handleEdit}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
            ) : (
                message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )}

            {/* Reactions */}
            {message.reactions && Object.keys(message.reactions).length > 0 && (
                <div className="flex gap-1 pt-1">
                    {Object.entries(message.reactions).map(([emoji, users]) => 
                        users.length > 0 && (
                            <div key={emoji} className="flex items-center rounded-full bg-secondary px-1.5 py-0.5 text-xs">
                                <span>{emoji}</span>
                                <span className="ml-1 text-secondary-foreground">{users.length}</span>
                            </div>
                        )
                    )}
                </div>
            )}
        
            {/* Timestamp and read receipt */}
            <div className="flex items-center gap-1 self-end mt-1">
                {message.isEdited && !isEditing && <span className="text-xs text-muted-foreground/80">(edited)</span>}
                <span className={cn(
                    "text-xs",
                    isSender ? 'text-primary-foreground/80' : 'text-muted-foreground'
                )}>
                    {message.timestamp ? format(message.timestamp.toDate(), "p") : "sending..."}
                </span>
                {isSender && (
                    isRead ? <CheckCheck size={16} className="text-blue-400" /> : <Check size={16} className={cn(isSender ? 'text-primary-foreground/80' : 'text-muted-foreground')} />
                )}
            </div>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal size={16}/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => onReply(message)}>
                    <CornerUpLeft className="mr-2 h-4 w-4" />
                    <span>Reply</span>
                </DropdownMenuItem>
                <Popover>
                    <PopoverTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                             <SmilePlus className="mr-2 h-4 w-4" />
                             <span>React</span>
                        </DropdownMenuItem>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-1">
                        <div className="flex gap-1">
                        {EMOJI_REACTIONS.map((emoji) => (
                            <Button
                            key={emoji}
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReaction(emoji)}
                            >
                            {emoji}
                            </Button>
                        ))}
                        </div>
                    </PopoverContent>
                </Popover>
                {isSender && message.content && (
                    <DropdownMenuItem onSelect={() => {
                        setEditedContent(message.content);
                        setIsEditing(true);
                    }}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                    </DropdownMenuItem>
                )}
                {isSender && (
                    <DropdownMenuItem onSelect={handleDelete} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
