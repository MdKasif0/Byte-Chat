
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClient();


  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    // This requires a Supabase Edge Function to handle properly.
    // The function would re-authenticate and then delete the user.
    // For this client-side example, we'll just log out.
    // A real implementation needs a server-side component for security.
    toast({
        title: "Manual Deletion Required",
        description: "To delete your account, please contact support. You will now be logged out.",
    });

    await supabase.auth.signOut();
    router.push('/login');

    setIsDeleting(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeleteAccount} 
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
