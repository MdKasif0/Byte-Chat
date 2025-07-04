"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function ProfileSetupRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Profile setup is now handled by the initial ProfileSetupDialog
    // This page is just a fallback to redirect to the main chat interface
    router.replace("/chat");
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
