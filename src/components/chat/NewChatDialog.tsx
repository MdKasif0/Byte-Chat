
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { useAuth } from "@/context/AuthContext";
import { findUserByPhoneNumber, createChat, createGroupChat } from "@/lib/chat";
import type { UserProfile } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const directMessageSchema = z.object({
  phone: z.string().min(1, "Phone number cannot be empty."),
});

const groupSchema = z.object({
    groupName: z.string().min(3, "Group name must be at least 3 characters."),
    members: z.array(z.string()).min(1, "You must select at least one member."),
});

type NewChatDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function NewChatDialog({ open, onOpenChange }: NewChatDialogProps) {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const fetchUsers = async () => {
        setUsersLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .neq('id', currentUser.id);
        if (error) {
            console.error("Error fetching users for new chat dialog", error);
        } else {
            setUsers(data as UserProfile[]);
        }
        setUsersLoading(false);
    }
    fetchUsers();
  }, [currentUser, supabase]);
  
  const dmForm = useForm<z.infer<typeof directMessageSchema>>({
    resolver: zodResolver(directMessageSchema),
    defaultValues: { phone: "" },
  });

  const groupForm = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: { groupName: "", members: [] },
  });

  const onDirectMessageSubmit = async (values: z.infer<typeof directMessageSchema>) => {
    if (!currentUser) return;
    setIsSubmitting(true);

    if (values.phone === currentUser.email) {
        dmForm.setError("phone", { message: "You can't start a chat with yourself." });
        setIsSubmitting(false);
        return;
    }

    try {
      const targetUser = await findUserByPhoneNumber(values.phone);
      if (!targetUser) {
        dmForm.setError("phone", { message: "User not found." });
        return;
      }
      const chatId = await createChat(currentUser.id, targetUser.id);
      
      onOpenChange(false);
      dmForm.reset();
      router.push(`/chat/${chatId}`);

    } catch (error) {
      console.error("Error creating chat:", error);
      toast({ variant: "destructive", title: "Failed to create chat." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const onGroupSubmit = async (values: z.infer<typeof groupSchema>) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    
    try {
        const chatId = await createGroupChat(currentUser.id, values.members, values.groupName);
        onOpenChange(false);
        groupForm.reset();
        router.push(`/chat/${chatId}`);
    } catch (error) {
        console.error("Error creating group chat:", error);
        toast({ variant: "destructive", title: "Failed to create group." });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a Conversation</DialogTitle>
          <DialogDescription>
            Start a new one-on-one chat or create a group.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="dm" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dm">Direct Message</TabsTrigger>
                <TabsTrigger value="group">New Group</TabsTrigger>
            </TabsList>
            <TabsContent value="dm" className="pt-4">
                 <Form {...dmForm}>
                    <form onSubmit={dmForm.handleSubmit(onDirectMessageSubmit)} className="space-y-4">
                        <FormField
                        control={dmForm.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>User's Phone Number</FormLabel>
                            <FormControl>
                                <Input placeholder="+1 234 567 8900" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? "Starting..." : "Start Chat"}
                        </Button>
                    </form>
                </Form>
            </TabsContent>
            <TabsContent value="group" className="pt-4">
                 <Form {...groupForm}>
                    <form onSubmit={groupForm.handleSubmit(onGroupSubmit)} className="space-y-6">
                        <FormField
                            control={groupForm.control}
                            name="groupName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Group Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="My Awesome Group" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={groupForm.control}
                            name="members"
                            render={() => (
                                <FormItem>
                                     <FormLabel>Select Members</FormLabel>
                                     <ScrollArea className="h-48 w-full rounded-md border p-2">
                                        {usersLoading ? <p>Loading users...</p> 
                                        : users && users.length > 0 ? (
                                            <div className="space-y-2">
                                            {users.map(user => (
                                                <FormField
                                                    key={user.id}
                                                    control={groupForm.control}
                                                    name="members"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md p-2 hover:bg-muted transition-colors">
                                                            <FormControl>
                                                                <Checkbox
                                                                     checked={field.value?.includes(user.id)}
                                                                     onCheckedChange={(checked) => {
                                                                        return checked
                                                                        ? field.onChange([...field.value, user.id])
                                                                        : field.onChange(field.value?.filter((value) => value !== user.id))
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={user.photo_url} />
                                                                <AvatarFallback>{user.display_name?.[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <Label className="font-normal w-full" onClick={(e) => e.preventDefault()}>
                                                                {user.display_name}
                                                            </Label>
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                            </div>
                                        ) : <p>No other users found.</p>}
                                     </ScrollArea>
                                     <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? "Creating..." : "Create Group"}
                        </Button>
                    </form>
                 </Form>
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
