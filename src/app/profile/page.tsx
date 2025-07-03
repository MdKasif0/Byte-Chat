"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { ArrowLeft, User, Info, Phone, Link2 as LinkIcon, Pencil, Camera } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase/config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfile } from "@/lib/types";

const nameSchema = z.object({
  name: z.string().min(3, "Username must be at least 3 characters.").max(15, "Username must be no more than 15 characters.").regex(/^[a-zA-Z0-9_]+$/, {
    message: "Username can only contain letters, numbers, and underscores.",
  }),
});
const aboutSchema = z.object({
  about: z.string().max(150, "About cannot be longer than 150 characters."),
});

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isNameDialogOpen, setNameDialogOpen] = useState(false);
  const [isAboutDialogOpen, setAboutDialogOpen] = useState(false);

  const nameForm = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
  });
  const aboutForm = useForm<z.infer<typeof aboutSchema>>({
    resolver: zodResolver(aboutSchema),
  });

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data() as UserProfile;
          setProfile(data);
          nameForm.reset({ name: data.displayName });
          aboutForm.reset({ about: data.about });
        } else {
           router.push('/chat');
        }
      };
      fetchProfile();
    }
  }, [user, router, nameForm, aboutForm]);

  const onNameSubmit = async (values: z.infer<typeof nameSchema>) => {
    if (!user || !profile) return;

    const newUsername = values.name;
    const newUsernameLower = newUsername.toLowerCase();
    const oldUsernameLower = profile.displayName.toLowerCase();

    if (newUsernameLower === oldUsernameLower) {
      setNameDialogOpen(false);
      return;
    }

    const newUsernameRef = doc(db, "usernames", newUsernameLower);
    const newUsernameSnap = await getDoc(newUsernameRef);

    if (newUsernameSnap.exists()) {
      nameForm.setError("name", {
        type: "manual",
        message: "This username is already taken.",
      });
      return;
    }

    try {
      const batch = writeBatch(db);

      const oldUsernameRef = doc(db, "usernames", oldUsernameLower);
      batch.delete(oldUsernameRef);

      batch.set(newUsernameRef, { uid: user.uid });

      const userDocRef = doc(db, "users", user.uid);
      batch.update(userDocRef, { displayName: newUsername });

      await batch.commit();

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: newUsername });
      }
      
      setProfile((p) => (p ? { ...p, displayName: newUsername } : null));
      toast({ title: "Success", description: "Username updated." });
      setNameDialogOpen(false);
    } catch (error) {
      console.error("Error updating username:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update your username.",
      });
    }
  };
  
  const onAboutSubmit = async (values: z.infer<typeof aboutSchema>) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { about: values.about }, { merge: true });
      
      setProfile((p) => (p ? { ...p, about: values.about } : null));
      toast({ title: "Success", description: `About section updated.` });
      setAboutDialogOpen(false);
    } catch (error) {
      console.error("Error updating about:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not update about.` });
    }
  };

  if (!profile) {
    return (
       <div className="w-full min-h-screen p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex flex-col items-center gap-4 pt-8">
              <Skeleton className="h-32 w-32 rounded-full" />
              <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-8 pt-8">
              <div className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8" />
                  <div className="flex-grow space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-48" />
                  </div>
              </div>
              <div className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8" />
                  <div className="flex-grow space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-64" />
                  </div>
              </div>
          </div>
       </div>
    )
  }

  return (
    <div className="w-full min-h-screen">
      <header className="flex items-center gap-4 p-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold">Profile</h1>
      </header>

      <main className="p-4 md:p-6">
        <section className="flex flex-col items-center text-center gap-2 pt-8 pb-12">
          <div className="relative">
            <Avatar className="w-32 h-32 text-4xl border-2 border-primary/50">
              <AvatarImage src={profile.photoURL || 'https://placehold.co/200x200.png'} alt={profile.displayName} data-ai-hint="person" />
              <AvatarFallback>{profile.displayName?.[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <Button size="icon" className="absolute bottom-1 right-1 rounded-full h-8 w-8 bg-primary hover:bg-primary/90">
                <Camera className="h-4 w-4" />
                <span className="sr-only">Edit photo</span>
            </Button>
          </div>
        </section>
        
        <Separator />

        <section className="py-6 space-y-6">
            <InfoRow icon={<User className="text-muted-foreground" />} label="Username">
                <div className="flex items-center justify-between w-full">
                    <span>{profile.displayName}</span>
                    <Button variant="ghost" size="icon" onClick={() => setNameDialogOpen(true)}><Pencil className="h-4 w-4" /></Button>
                </div>
            </InfoRow>

            <InfoRow icon={<Info className="text-muted-foreground" />} label="About">
                 <div className="flex items-center justify-between w-full">
                    <p className="text-sm text-foreground/80 pr-2">{profile.about}</p>
                    <Button variant="ghost" size="icon" onClick={() => setAboutDialogOpen(true)}><Pencil className="h-4 w-4" /></Button>
                </div>
            </InfoRow>

            <Separator />
            
            <InfoRow icon={<Phone className="text-muted-foreground" />} label="Phone">
                <p className="text-sm text-foreground/80">
                    {profile.phone || "Not provided"}
                </p>
            </InfoRow>
            
            <InfoRow icon={<LinkIcon className="text-muted-foreground" />} label="Links">
                 <button className="text-sm text-primary">Add links</button>
            </InfoRow>
        </section>
      </main>

      {/* Edit Username Dialog */}
      <Dialog open={isNameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Username</DialogTitle></DialogHeader>
          <Form {...nameForm}>
            <form onSubmit={nameForm.handleSubmit(onNameSubmit)} className="space-y-4">
              <FormField
                control={nameForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                <Button type="submit" disabled={nameForm.formState.isSubmitting}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit About Dialog */}
       <Dialog open={isAboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit About</DialogTitle></DialogHeader>
          <Form {...aboutForm}>
            <form onSubmit={aboutForm.handleSubmit(onAboutSubmit)} className="space-y-4">
              <FormField
                control={aboutForm.control}
                name="about"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About</FormLabel>
                    <FormControl><Textarea {...field} className="min-h-[100px]" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                <Button type="submit" disabled={aboutForm.formState.isSubmitting}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: ReactNode, label: string, children: ReactNode }) {
    return (
        <div className="flex items-start gap-4">
            {icon}
            <div className="flex-grow">
                <p className="text-sm text-primary font-semibold">{label}</p>
                {children}
            </div>
        </div>
    )
}
