
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

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
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

const formSchema = z.object({
  display_name: z.string().min(3, {
    message: "Display name must be at least 3 characters.",
  }),
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
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      display_name: "",
      phone: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
            display_name: values.display_name,
            phone: values.phone,
            status: "Hey there! I am using ByteChat.",
            photo_url: user.user_metadata?.avatar_url || `https://placehold.co/200x200.png?text=${values.display_name.charAt(0).toUpperCase()}`,
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // We also update the user metadata in auth for consistency
      await supabase.auth.updateUser({
        data: { 
            display_name: values.display_name,
            phone: values.phone
        }
      });
      
      toast({
        title: "Welcome!",
        description: "Your profile has been set up.",
      });
      
      await refreshProfile();
      onOpenChange(false);
      router.push('/profile');

    } catch (error: any) {
      console.error("Error setting up profile: ", error);
      if (error.code === '23505') { // Postgres unique violation
        toast({ variant: "destructive", title: "Setup Failed", description: "This phone number is already in use."});
      } else {
        toast({
            variant: "destructive",
            title: "Setup Failed",
            description: "Could not set up your profile. Please try again.",
        });
      }
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
            Let's finish setting up your profile.
            </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4">
             <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
