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
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const formSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }).max(15, {
    message: "Username must be no more than 15 characters.",
  }).regex(/^[a-zA-Z0-9_]+$/, {
    message: "Username can only contain letters, numbers, and underscores.",
  }),
});

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: user?.displayName || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }

    const newUsername = values.username;
    const oldUsername = user.displayName;

    if (newUsername === oldUsername) {
        toast({ title: "No Changes", description: "Your username is already set to this." });
        return;
    }

    const usernameRef = doc(db, "usernames", newUsername);

    try {
        const usernameDoc = await getDoc(usernameRef);
        if (usernameDoc.exists()) {
            form.setError("username", { type: "manual", message: "This username is already taken." });
            return;
        }

        const batch = writeBatch(db);

        // Set new username mapping
        batch.set(doc(db, "usernames", newUsername), { uid: user.uid });
        
        // Remove old username mapping if it exists
        if(oldUsername) {
            batch.delete(doc(db, "usernames", oldUsername));
        }

        // Update user profile document
        const userRef = doc(db, "users", user.uid);
        batch.set(userRef, { displayName: newUsername, email: user.email }, { merge: true });

        await batch.commit();

        await updateProfile(user, { displayName: newUsername });

        toast({
            title: "Success!",
            description: "Your username has been updated.",
        });
        router.push("/chat");

    } catch (error) {
        console.error("Error updating username: ", error);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update your username. Please try again.",
        });
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" asChild>
                <Link href="/chat">
                    <ArrowLeft />
                </Link>
            </Button>
            <div className="text-center flex-grow">
                <CardTitle className="text-2xl font-headline">Your Profile</CardTitle>
                <CardDescription>
                    Manage your account settings.
                </CardDescription>
            </div>
            <div className="w-10"></div>
        </div>
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
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
