"use client";

import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import ChatList from "./ChatList";
import { PanelLeft } from "lucide-react";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen>
        <Sidebar variant="inset" collapsible="icon">
            <ChatList />
        </Sidebar>
        <SidebarInset>
            <div className="p-2 md:hidden">
                <SidebarTrigger />
            </div>
            {children}
        </SidebarInset>
    </SidebarProvider>
  );
}
