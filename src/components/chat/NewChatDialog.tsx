"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { findUserByUsername, createChat } from "@/lib/chat";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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

const formSchema = z.object({
  username: z.string().min(1, "Username cannot be empty."),
});

type NewChatDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function NewChatDialog({ open, onOpenChange }: NewChatDialogProps) {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "" },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "You must be logged in." });
      return;
    }
    if (values.username.toLowerCase() === currentUser.displayName?.toLowerCase()) {
        form.setError("username", { message: "You can't start a chat with yourself." });
        return;
    }

    try {
      const targetUser = await findUserByUsername(values.username);
      if (!targetUser) {
        form.setError("username", { message: "User not found." });
        return;
      }

      const chatId = await createChat(currentUser.uid, targetUser.uid);
      
      onOpenChange(false);
      form.reset();
      router.push(`/chat/${chatId}`);

    } catch (error) {
      console.error("Error creating chat:", error);
      toast({ variant: "destructive", title: "Failed to create chat." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
          <DialogDescription>
            Enter the username of the person you want to chat with.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. john_doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Starting..." : "Start Chat"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
