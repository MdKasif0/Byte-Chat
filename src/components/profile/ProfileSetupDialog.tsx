"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import * as React from "react";
import { X, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogPortal,
  DialogOverlay,
  DialogClose,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
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
import { auth, db } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }).max(15, {
    message: "Username must be no more than 15 characters.",
  }).regex(/^[a-zA-Z0-9_]+$/, {
    message: "Username can only contain letters, numbers, and underscores.",
  }),
});

type ProfileSetupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ProfileSetupDialog({ open, onOpenChange }: ProfileSetupDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }

    const username = values.username.toLowerCase();
    const userRef = doc(db, "users", user.uid);
    const usernameRef = doc(db, "usernames", username);

    try {
      const usernameDoc = await getDoc(usernameRef);
      if (usernameDoc.exists()) {
        form.setError("username", { type: "manual", message: "This username is already taken." });
        return;
      }

      const batch = writeBatch(db);
      
      batch.set(userRef, { 
        uid: user.uid,
        displayName: username, 
        email: user.email,
        about: "Hey there! I am using ByteChat.",
        phone: "",
        links: [],
        photoURL: user.photoURL || `https://placehold.co/200x200.png?text=${username.charAt(0).toUpperCase()}`,
        isOnline: true,
        lastSeen: serverTimestamp(),
      });
      batch.set(usernameRef, { uid: user.uid });
      
      await batch.commit();

      await updateProfile(user, { 
        displayName: username,
        photoURL: user.photoURL || `https://placehold.co/200x200.png?text=${username.charAt(0).toUpperCase()}`
      });

      toast({
        title: "Welcome!",
        description: "Your profile has been set up.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error setting up profile: ", error);
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description: "Could not set up your profile. Please try again.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[425px]"
        onInteractOutside={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        <DialogHeader className="text-center items-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl font-headline">Welcome to ByteChat</DialogTitle>
            <DialogDescription>
            Let's set up your profile. Choose a unique username.
            </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="your_username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Save and Continue"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

declare module "@radix-ui/react-dialog" {
    interface DialogContentProps {
        hideCloseButton?: boolean;
    }
}

const DialogContentOld = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideCloseButton?: boolean }
>(({ className, children, hideCloseButton, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      {!hideCloseButton && (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
));
