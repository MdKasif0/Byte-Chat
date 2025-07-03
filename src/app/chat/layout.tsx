"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ChatLayout from "@/components/chat/ChatLayout";
import ProfileSetupDialog from "@/components/profile/ProfileSetupDialog";
import { Loader2 } from "lucide-react";

export default function ChatAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isSetupDialogOpen, setSetupDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (!user.displayName) {
        setSetupDialogOpen(true);
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user.displayName && !isSetupDialogOpen) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <ProfileSetupDialog open={isSetupDialogOpen} onOpenChange={setSetupDialogOpen} />
      <ChatLayout>{children}</ChatLayout>
    </>
  );
}
