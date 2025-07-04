"use client";

import { createClient } from "@/lib/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { MessagesSquare } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const { session } = useAuth();
  const [redirectUrl, setRedirectUrl] = useState("");

  useEffect(() => {
    if (session) {
      router.replace("/chat");
    }
  }, [session, router]);
  
  useEffect(() => {
    // This ensures window.location.origin is only used on the client side
    setRedirectUrl(`${window.location.origin}/auth/callback`);
  }, []);
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
       <div className="w-full max-w-sm space-y-4">
        <div className="mx-auto flex flex-col items-center justify-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessagesSquare className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-headline">ByteChat</h1>
        </div>
        {redirectUrl && (
            <Auth
                supabaseClient={supabase}
                appearance={{ theme: ThemeSupa }}
                theme="dark"
                providers={[]}
                redirectTo={redirectUrl}
            />
        )}
       </div>
    </main>
  );
}
