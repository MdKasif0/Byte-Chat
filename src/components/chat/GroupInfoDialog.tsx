
"use client";

import React from "react";
import { Crown, MoreVertical, Shield, Trash, UserPlus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Chat, MemberProfile } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { demoteToAdmin, promoteToAdmin, removeMemberFromGroup } from "@/lib/chat";
import { cn } from "@/lib/utils";

type GroupInfoDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  chat: Chat;
};

export default function GroupInfoDialog({ isOpen, setIsOpen, chat }: GroupInfoDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isCurrentUserAdmin = chat.admins?.includes(user?.id || "") || false;

  const handlePromote = async (memberId: string) => {
    try {
      await promoteToAdmin(chat.id, memberId);
      toast({ title: "Success", description: "Member promoted to admin." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not promote member." });
    }
  };
  
  const handleDemote = async (memberId: string) => {
    try {
        await demoteToAdmin(chat.id, memberId);
        toast({ title: "Success", description: "Admin demoted to member." });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not demote admin." });
    }
  };

  const handleKick = async (memberId: string) => {
    if (window.confirm("Are you sure you want to kick this member?")) {
      try {
        await removeMemberFromGroup(chat.id, memberId);
        toast({ title: "Success", description: "Member has been kicked." });
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not kick member." });
      }
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl">{chat.group_name}</DialogTitle>
            <DialogDescription>{chat.members.length} members</DialogDescription>
        </DialogHeader>

        <div className="flex items-center p-6 pt-2">
            <Button disabled={!isCurrentUserAdmin}> <UserPlus className="mr-2 h-4 w-4"/> Add Members</Button>
        </div>

        <ScrollArea className="h-[50vh]">
            <div className="p-6 pt-0 space-y-4">
            {chat.member_profiles.map((member) => (
                <div key={member.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={member.photo_url} alt={member.display_name} />
                            <AvatarFallback>{member.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{member.display_name}</p>
                            <p className={cn("text-xs", member.is_online ? "text-green-500" : "text-muted-foreground")}>
                                {member.is_online ? "Online" : "Offline"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {chat.admins?.includes(member.id) && (
                            <Badge variant="secondary" className="text-amber-500 border-amber-500/50">
                                <Crown className="h-3 w-3 mr-1"/>
                                Admin
                            </Badge>
                        )}
                        {isCurrentUserAdmin && user?.id !== member.id && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                        <MoreVertical className="h-4 w-4"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {chat.admins?.includes(member.id) ? (
                                        <DropdownMenuItem onClick={() => handleDemote(member.id)}>
                                            <Shield className="mr-2 h-4 w-4"/> Demote to Member
                                        </DropdownMenuItem>
                                    ) : (
                                        <DropdownMenuItem onClick={() => handlePromote(member.id)}>
                                            <Crown className="mr-2 h-4 w-4"/> Promote to Admin
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleKick(member.id)}>
                                        <Trash className="mr-2 h-4 w-4"/> Kick Member
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            ))}
            </div>
        </ScrollArea>
         <div className="p-6 border-t">
            <Button variant="destructive" className="w-full">Leave Group</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
