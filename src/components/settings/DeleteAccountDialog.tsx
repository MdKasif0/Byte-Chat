
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "firebase/auth";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const handleDeleteAccount = async () => {
    if (!user || !user.email) {
      toast({ variant: "destructive", title: "Error", description: "No user found to delete." });
      return;
    }
    if (!password) {
        setError("Password is required to delete your account.");
        return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      await deleteUser(user);
      
      toast({ title: "Account Deleted", description: "Your account has been permanently deleted." });
      onOpenChange(false);
      router.push('/signup'); // Redirect to signup after deletion

    } catch (err: any) {
        let description = "An unknown error occurred.";
        if (err.code === 'auth/wrong-password') {
            description = "The password you entered is incorrect.";
        }
        setError(description);
        console.error("Error deleting account:", err);
    } finally {
        setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setPassword("");
    setError(null);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers. Please enter your password to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
            <Label htmlFor="password-confirm" className={error ? 'text-destructive' : ''}>Password</Label>
            <Input 
                id="password-confirm"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
            />
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
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
