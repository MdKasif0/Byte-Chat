"use client";

import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Check, CheckCheck, CornerUpLeft, Edit, SmilePlus, Trash2, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";
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
};

export default function MessageBubble({ message, onReply }: MessageBubbleProps) {
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
      if (window.confirm("Are you sure you want to delete this message?")) {
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
             {/* Reply block */}
            {message.replyTo && (
                <div className="mb-1 rounded-md bg-black/20 p-2 text-xs">
                    <p className="font-bold">{message.replyTo.senderName}</p>
                    <p className="truncate">{message.replyTo.content}</p>
                </div>
            )}

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
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
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
            <div className="flex items-center gap-1 self-end">
                {message.isEdited && !isEditing && <span className="text-xs text-muted-foreground">(edited)</span>}
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
                {isSender && (
                    <>
                        <DropdownMenuItem onSelect={() => {
                            setEditedContent(message.content);
                            setIsEditing(true);
                        }}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleDelete} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
