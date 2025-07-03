
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, LogOut, Palette, UserCircle, Moon, Sun, Lock, Fingerprint, KeyRound, Trash2, MessageSquareQuote, Star, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import ChangePasswordDialog from "@/components/settings/ChangePasswordDialog";
import DeleteAccountDialog from "@/components/settings/DeleteAccountDialog";
import FeedbackDialog from "@/components/settings/FeedbackDialog";
import { useTheme } from "next-themes";

function SettingsItem({ icon, title, description, onClick, control, isDestructive = false }: { icon: React.ReactNode, title: string, description: string, onClick?: () => void, control?: React.ReactNode, isDestructive?: boolean }) {
  const isClickable = !!onClick;
  const Component = isClickable ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={`flex items-center w-full p-4 text-left ${isClickable ? 'hover:bg-muted transition-colors rounded-lg' : ''} ${isDestructive ? 'text-destructive' : ''}`}
    >
      <div className={`mr-4 ${isDestructive ? 'text-destructive' : 'text-primary'}`}>{icon}</div>
      <div className="flex-grow">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {control ? control : isClickable ? <ChevronRight className="h-5 w-5 text-muted-foreground" /> : null}
    </Component>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isChangePasswordOpen, setChangePasswordOpen] = useState(false);
  const [isDeleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [isFeedbackOpen, setFeedbackOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();


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

  return (
    <>
    <div className="flex flex-col h-full bg-background text-foreground">
      <header className="p-4 border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <h1 className="text-2xl font-bold text-center">Settings</h1>
      </header>
      <main className="flex-grow p-2 md:p-4">
        <div className="space-y-4">
            {/* Account Section */}
            <div>
                <h2 className="px-4 pt-4 pb-2 text-lg font-semibold">Account</h2>
                <div className="bg-card rounded-xl border">
                    <SettingsItem
                        icon={<UserCircle className="h-6 w-6" />}
                        title="Profile"
                        description="Manage your account details"
                        onClick={() => router.push('/profile')}
                    />
                </div>
            </div>

            {/* Appearance Section */}
             <div>
                <h2 className="px-4 pt-4 pb-2 text-lg font-semibold">Appearance</h2>
                <div className="bg-card rounded-xl border">
                    <SettingsItem
                        icon={<Palette className="h-6 w-6" />}
                        title="Theme"
                        description="Switch between light and dark mode"
                        control={
                            <div className="flex items-center gap-2">
                                <Sun className="h-5 w-5" />
                                <Switch
                                    checked={resolvedTheme === 'dark'}
                                    onCheckedChange={(isDark) => setTheme(isDark ? 'dark' : 'light')}
                                    aria-label="Toggle theme"
                                />
                                <Moon className="h-5 w-5" />
                            </div>
                        }
                    />
                </div>
            </div>
            
            {/* Data Management Section */}
            <div>
                <h2 className="px-4 pt-4 pb-2 text-lg font-semibold">Data Management</h2>
                <div className="bg-card rounded-xl border divide-y divide-border">
                     <SettingsItem
                        icon={<Star className="h-6 w-6" />}
                        title="Starred Messages"
                        description="View your starred messages"
                        onClick={() => toast({ title: "Coming Soon!", description: "This feature is under development."})}
                    />
                    <SettingsItem
                        icon={<Archive className="h-6 w-6" />}
                        title="Archived Chats"
                        description="View your archived chats"
                        onClick={() => toast({ title: "Coming Soon!", description: "This feature is under development."})}
                    />
                </div>
            </div>

            {/* Support & Feedback Section */}
            <div>
                <h2 className="px-4 pt-4 pb-2 text-lg font-semibold">Support & Feedback</h2>
                <div className="bg-card rounded-xl border">
                    <SettingsItem
                        icon={<MessageSquareQuote className="h-6 w-6" />}
                        title="Submit Feedback"
                        description="Report bugs or suggest new features"
                        onClick={() => setFeedbackOpen(true)}
                    />
                </div>
            </div>

             {/* Security Section */}
            <div>
                <h2 className="px-4 pt-4 pb-2 text-lg font-semibold">Security</h2>
                <div className="bg-card rounded-xl border divide-y divide-border">
                    <SettingsItem
                        icon={<Fingerprint className="h-6 w-6" />}
                        title="App Lock"
                        description="Coming Soon"
                        control={<Switch disabled />}
                    />
                    <SettingsItem
                        icon={<Lock className="h-6 w-6" />}
                        title="Manage Devices"
                        description="Coming Soon"
                        onClick={() => {}}
                    />
                    <SettingsItem
                        icon={<KeyRound className="h-6 w-6" />}
                        title="Change Password"
                        description="Update your account password"
                        onClick={() => setChangePasswordOpen(true)}
                    />
                    <Separator />
                     <SettingsItem
                        icon={<LogOut className="h-6 w-6" />}
                        title="Logout"
                        description="Sign out from your account"
                        onClick={handleLogout}
                    />
                    <Separator />
                     <SettingsItem
                        icon={<Trash2 className="h-6 w-6" />}
                        title="Delete Account"
                        description="Permanently delete your account"
                        onClick={() => setDeleteAccountOpen(true)}
                        isDestructive
                    />
                </div>
            </div>
        </div>
      </main>
    </div>
    <ChangePasswordDialog open={isChangePasswordOpen} onOpenChange={setChangePasswordOpen} />
    <DeleteAccountDialog open={isDeleteAccountOpen} onOpenChange={setDeleteAccountOpen} />
    <FeedbackDialog open={isFeedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
