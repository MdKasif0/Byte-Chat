"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessagesSquare, Plus, Settings, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import NewChatDialog from './chat/NewChatDialog';

export default function BottomNavBar() {
  const pathname = usePathname();
  const [isNewChatOpen, setNewChatOpen] = useState(false);

  // Home is /chat, Settings is /settings
  const navItems = [
    { href: '/chat', icon: MessagesSquare, label: 'Chat' },
    { href: '/calls', icon: Phone, label: 'Calls' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-background via-background/80 to-transparent" />
      <footer className="fixed bottom-4 left-1/2 z-50 h-16 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2">
        <div className="flex h-full items-center justify-between rounded-full bg-card p-2 shadow-lg border">
          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground transition-colors duration-300',
                  pathname.startsWith(item.href) && 'bg-primary text-primary-foreground'
                )}
              >
                <item.icon className="h-6 w-6" />
              </Link>
            ))}
          </div>
          <button
            onClick={() => setNewChatOpen(true)}
            aria-label="New Chat"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </footer>
      <NewChatDialog open={isNewChatOpen} onOpenChange={setNewChatOpen} />
    </>
  );
}
