"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import * as React from "react";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { auth, db } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";

const formSchema = z.object({
  phone: z.string().min(10, {
    message: "Please enter a valid phone number.",
  }).max(20, {
    message: "This phone number is too long.",
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
      phone: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }

    const phoneNumber = values.phone;
    const userRef = doc(db, "users", user.uid);
    const phoneNumberRef = doc(db, "phonenumbers", phoneNumber);

    try {
      const phoneNumberDoc = await getDoc(phoneNumberRef);
      if (phoneNumberDoc.exists()) {
        form.setError("phone", { type: "manual", message: "This phone number is already in use." });
        return;
      }

      const batch = writeBatch(db);
      
      batch.set(userRef, { 
        uid: user.uid,
        displayName: phoneNumber, 
        email: user.email,
        about: "Hey there! I am using ByteChat.",
        phone: phoneNumber,
        links: [],
        photoURL: user.photoURL || `https://placehold.co/200x200.png?text=${phoneNumber.charAt(0).toUpperCase()}`,
        isOnline: true,
        lastSeen: serverTimestamp(),
      });
      batch.set(phoneNumberRef, { uid: user.uid });
      
      await batch.commit();

      await updateProfile(user, { 
        displayName: phoneNumber,
        photoURL: user.photoURL || `https://placehold.co/200x200.png?text=${phoneNumber.charAt(0).toUpperCase()}`
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
            Let's set up your profile. Please enter your phone number.
            </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234 567 8900" {...field} />
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
