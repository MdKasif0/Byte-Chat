"use client";

import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInput,
  SidebarFooter
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, Search } from "lucide-react";
import Link from "next/link";
import UserNav from "./UserNav";
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";

const chats = [
  { id: '1', name: 'Alice', lastMessage: 'Hey, how are you?', time: '10:40 AM', avatar: 'https://placehold.co/40x40.png', online: true, aiHint: 'woman smiling' },
  { id: '2', name: 'Dev Team', lastMessage: 'Bob: See you there!', time: '9:30 AM', avatar: 'https://placehold.co/40x40.png', online: false, aiHint: 'team work' },
  { id: '3', name: 'Bob', lastMessage: 'Okay, sounds good.', time: 'Yesterday', avatar: 'https://placehold.co/40x40.png', online: true, aiHint: 'man portrait' },
  { id: '4', name: 'Charlie', lastMessage: 'You sent an image.', time: 'Yesterday', avatar: 'https://placehold.co/40x40.png', online: false, aiHint: 'person thinking' },
];

export default function ChatList() {
    const pathname = usePathname();
  return (
    <>
      <SidebarHeader className="border-b">
        <div className="flex w-full items-center justify-between">
          <h1 className="text-xl font-bold font-headline">Cryptochat</h1>
          <UserNav />
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <SidebarInput placeholder="Search chats..." className="pl-8" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full">
          <SidebarMenu>
            {chats.map((chat) => (
              <SidebarMenuItem key={chat.id} asChild className="p-0">
                <Link href={`/chat/${chat.id}`} className="w-full">
                  <SidebarMenuButton className="h-auto p-2 w-full" size="lg" isActive={pathname === `/chat/${chat.id}`}>
                    <div className="relative">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={chat.avatar} alt={chat.name} data-ai-hint={chat.aiHint} />
                            <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {chat.online && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />}
                    </div>
                    <div className="flex-grow text-left overflow-hidden">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold truncate">{chat.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{chat.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                    </div>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="outline" className="w-full justify-start">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Chat
        </Button>
      </SidebarFooter>
    </>
  );
}
