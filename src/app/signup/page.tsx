"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Redirecting to login...</p>
    </div>
  );
}
