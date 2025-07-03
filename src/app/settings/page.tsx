"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, LogOut, Palette, UserCircle, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: error.message,
      });
    }
  };

  const handleThemeChange = (isDark: boolean) => {
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <header className="p-4 border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <h1 className="text-2xl font-bold text-center">Settings</h1>
      </header>
      <main className="flex-grow p-4 space-y-6">
        
        <button
          onClick={() => router.push('/profile')}
          className="flex items-center w-full p-4 rounded-2xl bg-card hover:bg-muted transition-colors text-left"
        >
          <UserCircle className="h-7 w-7 mr-4 text-primary" />
          <div className="flex-grow">
            <p className="font-semibold">Profile</p>
            <p className="text-sm text-muted-foreground">Manage your account details</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="flex items-center w-full p-4 rounded-2xl bg-card">
          <Palette className="h-7 w-7 mr-4 text-primary" />
          <div className="flex-grow">
            <p className="font-semibold">Theme</p>
            <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
          </div>
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            <Switch onCheckedChange={handleThemeChange} />
            <Moon className="h-5 w-5" />
          </div>
        </div>
        
        <div className="pt-4">
            <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full rounded-full py-6 text-base"
            >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
            </Button>
        </div>
      </main>
    </div>
  );
}
