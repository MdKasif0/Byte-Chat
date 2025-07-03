"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProfileSetupDialog from "@/components/profile/ProfileSetupDialog";
import { Loader2 } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";
import { requestPermissionAndToken } from "@/lib/firebase/messaging";

export default function ChatAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSetupDialogOpen, setSetupDialogOpen] = useState(false);

  // Show Nav Bar on the main chat page, but not on individual conversation pages.
  const showNavBar = pathname === '/chat';

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (!user.displayName) {
        setSetupDialogOpen(true);
      } else {
        // Once user is logged in and profile is set up, request notification permissions
        requestPermissionAndToken(user.uid);
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
      <div className={showNavBar ? "pb-28" : ""}>{children}</div>
      {showNavBar && <BottomNavBar />}
    </>
  );
}
