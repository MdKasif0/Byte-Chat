"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, writeBatch, Timestamp } from "firebase/firestore";
import { ArrowLeft, User, Phone, Link2 as LinkIcon, Pencil, Camera, BookText } from "lucide-react";

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

const phoneSchema = z.object({
  phone: z.string().min(10, {
    message: "Please enter a valid phone number.",
  }).max(20, {
    message: "This phone number is too long.",
  }),
});
const statusSchema = z.object({
  status: z.string().max(150, "Status cannot be longer than 150 characters."),
});

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isPhoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [isStatusDialogOpen, setStatusDialogOpen] = useState(false);

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
  });
  const statusForm = useForm<z.infer<typeof statusSchema>>({
    resolver: zodResolver(statusSchema),
  });

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        let profileData: UserProfile;

        if (userDocSnap.exists()) {
          profileData = userDocSnap.data() as UserProfile;
        } else {
          // Fallback if the user document doesn't exist for some reason.
          profileData = {
            uid: user.uid,
            displayName: user.displayName || 'No number',
            email: user.email || '',
            photoURL: user.photoURL || `https://placehold.co/200x200.png`,
            status: 'Hey there! I am using ByteChat.',
            isOnline: true,
            lastSeen: new Timestamp(0, 0), // Placeholder
          };
        }
        
        setProfile(profileData);
        phoneForm.reset({ phone: profileData.displayName });
        statusForm.reset({ status: profileData.status });
      };
      fetchProfile();
    }
  }, [user, phoneForm, statusForm]);

  const onPhoneSubmit = async (values: z.infer<typeof phoneSchema>) => {
    if (!user || !profile) return;

    const newPhoneNumber = values.phone;
    const oldPhoneNumber = profile.displayName;

    if (newPhoneNumber === oldPhoneNumber) {
      setPhoneDialogOpen(false);
      return;
    }

    const newPhoneNumberRef = doc(db, "phonenumbers", newPhoneNumber);
    const newPhoneNumberSnap = await getDoc(newPhoneNumberRef);

    if (newPhoneNumberSnap.exists()) {
      phoneForm.setError("phone", {
        type: "manual",
        message: "This phone number is already taken.",
      });
      return;
    }

    try {
      const batch = writeBatch(db);

      const oldPhoneNumberRef = doc(db, "phonenumbers", oldPhoneNumber);
      batch.delete(oldPhoneNumberRef);

      batch.set(newPhoneNumberRef, { uid: user.uid });

      const userDocRef = doc(db, "users", user.uid);
      batch.update(userDocRef, { displayName: newPhoneNumber, phone: newPhoneNumber });

      await batch.commit();

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: newPhoneNumber });
      }
      
      setProfile((p) => (p ? { ...p, displayName: newPhoneNumber, phone: newPhoneNumber } : null));
      toast({ title: "Success", description: "Phone number updated." });
      setPhoneDialogOpen(false);
    } catch (error) {
      console.error("Error updating phone number:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update your phone number.",
      });
    }
  };
  
  const onStatusSubmit = async (values: z.infer<typeof statusSchema>) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { status: values.status }, { merge: true });
      
      setProfile((p) => (p ? { ...p, status: values.status } : null));
      toast({ title: "Success", description: `Status updated.` });
      setStatusDialogOpen(false);
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not update status.` });
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
            <InfoRow icon={<Phone className="text-muted-foreground" />} label="Phone Number">
                <div className="flex items-center justify-between w-full">
                    <span>{profile.displayName}</span>
                    <Button variant="ghost" size="icon" onClick={() => setPhoneDialogOpen(true)}><Pencil className="h-4 w-4" /></Button>
                </div>
            </InfoRow>

            <InfoRow icon={<BookText className="text-muted-foreground" />} label="Status">
                 <div className="flex items-center justify-between w-full">
                    <p className="text-sm text-foreground/80 pr-2">{profile.status}</p>
                    <Button variant="ghost" size="icon" onClick={() => setStatusDialogOpen(true)}><Pencil className="h-4 w-4" /></Button>
                </div>
            </InfoRow>

            <Separator />
            
            <InfoRow icon={<User className="text-muted-foreground" />} label="Email">
                <p className="text-sm text-foreground/80">
                    {profile.email || "Not provided"}
                </p>
            </InfoRow>
            
            <InfoRow icon={<LinkIcon className="text-muted-foreground" />} label="Links">
                 <button className="text-sm text-primary">Add links</button>
            </InfoRow>
        </section>
      </main>

      {/* Edit Phone Number Dialog */}
      <Dialog open={isPhoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Phone Number</DialogTitle></DialogHeader>
          <Form {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
              <FormField
                control={phoneForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                <Button type="submit" disabled={phoneForm.formState.isSubmitting}>Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Status Dialog */}
       <Dialog open={isStatusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Status</DialogTitle></DialogHeader>
          <Form {...statusForm}>
            <form onSubmit={statusForm.handleSubmit(onStatusSubmit)} className="space-y-4">
              <FormField
                control={statusForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl><Textarea {...field} className="min-h-[100px]" placeholder="What's on your mind?" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                <Button type="submit" disabled={statusForm.formState.isSubmitting}>Save</Button>
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
