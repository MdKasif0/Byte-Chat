"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, writeBatch } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ShieldCheck } from "lucide-react";

const formSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }).max(15, {
    message: "Username must be no more than 15 characters.",
  }).regex(/^[a-zA-Z0-9_]+$/, {
    message: "Username can only contain letters, numbers, and underscores.",
  }),
});

export default function ProfileSetupPage() {
  const { user } = useAuth();
  const router = useRouter();
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

    const username = values.username;
    const userRef = doc(db, "users", user.uid);
    const usernameRef = doc(db, "usernames", username);

    try {
      const usernameDoc = await getDoc(usernameRef);
      if (usernameDoc.exists()) {
        form.setError("username", { type: "manual", message: "This username is already taken." });
        return;
      }

      const batch = writeBatch(db);
      
      batch.set(userRef, { displayName: username, email: user.email });
      batch.set(usernameRef, { uid: user.uid });
      
      await batch.commit();

      await updateProfile(user, { displayName: username });

      toast({
        title: "Welcome!",
        description: "Your profile has been set up.",
      });
      router.push("/chat");
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
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl font-headline">Welcome to Cryptochat</CardTitle>
        <CardDescription>
          Let's set up your profile. Choose a unique username.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save and Continue"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
