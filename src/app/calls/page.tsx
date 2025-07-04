
"use client";

import { useRouter } from "next/navigation";
import { Phone, Video, PhoneMissed, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from 'react';

import { useAuth } from "@/context/AuthContext";
import type { Call } from "@/lib/types";
import { createChat } from "@/lib/chat";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function CallsPage() {
    const { user } = useAuth();
    const supabase = createClient();
    const [calls, setCalls] = useState<Call[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchCalls = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('calls')
                .select('*')
                .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching calls:", error);
            } else {
                setCalls(data as Call[]);
            }
            setLoading(false);
        };

        fetchCalls();

        const channel = supabase.channel('public:calls')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, (payload) => {
                fetchCalls();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, supabase]);

    return (
        <div className="h-full flex flex-col bg-background">
            <header className="p-4 border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                <h1 className="text-3xl font-bold">Calls</h1>
            </header>

            <main className="flex-grow">
                {loading ? (
                    <div className="p-4 space-y-4">
                        <CallLogSkeleton />
                        <CallLogSkeleton />
                        <CallLogSkeleton />
                        <CallLogSkeleton />
                    </div>
                ) : calls && calls.length > 0 ? (
                    <div className="space-y-1 p-2">
                        {calls.map(call => (
                            <CallLogItem key={call.id} call={call} currentUserId={user!.id} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 px-4">
                        <p className="font-semibold text-lg">No Call History</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            You haven't made or received any calls yet.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}

function CallLogItem({ call, currentUserId }: { call: Call; currentUserId: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const isOutgoing = call.caller_id === currentUserId;
    
    const otherUser = {
        id: isOutgoing ? call.callee_id : call.caller_id,
        name: isOutgoing ? call.callee_name : call.caller_name,
        photoURL: isOutgoing ? call.callee_photo_url : call.caller_photo_url,
    };

    if (!otherUser.name) {
        otherUser.name = "Unknown User";
    }

    const wasMissed = call.status === 'unanswered' || call.status === 'rejected' || call.status === 'cancelled';

    const getStatusIcon = () => {
        if (wasMissed && !isOutgoing) {
            return <PhoneMissed className="h-4 w-4 text-destructive" />;
        }
        if (isOutgoing) {
            return <ArrowUpRight className="h-4 w-4 text-muted-foreground" />;
        }
        return <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />;
    };

    const formatDuration = (seconds: number) => {
        if (isNaN(seconds) || seconds < 1) return "";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m > 0 ? `${m}m ` : ''}${s}s`;
    };

    const handleCallback = async () => {
        if (!currentUserId || !otherUser.id) {
          toast({ variant: "destructive", title: "Could not start call." });
          return;
        }
        try {
          const chatId = await createChat(currentUserId, otherUser.id);
          router.push(`/chat/${chatId}`);
          toast({ title: "Starting chat...", description: "You can initiate the call from the chat screen."});
        } catch (error) {
          console.error("Error creating chat for callback:", error);
          toast({ variant: "destructive", title: "Failed to start chat." });
        }
    };

    return (
        <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted transition-colors">
            <Avatar className="h-12 w-12">
                <AvatarImage src={otherUser.photoURL || undefined} alt={otherUser.name || ""} />
                <AvatarFallback>{otherUser.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-grow overflow-hidden">
                <h4 className={cn("font-semibold truncate", wasMissed && !isOutgoing && 'text-destructive')}>
                    {otherUser.name}
                </h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getStatusIcon()}
                    <span>
                        {call.created_at ? formatDistanceToNow(new Date(call.created_at), { addSuffix: true }) : '...'}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                 <div className="text-right text-xs text-muted-foreground">
                    {formatDuration(call.duration || 0)}
                 </div>
                <Button variant="ghost" size="icon" onClick={handleCallback}>
                    {call.type === 'video' ? <Video className="h-5 w-5 text-primary" /> : <Phone className="h-5 w-5 text-primary" />}
                </Button>
            </div>
        </div>
    );
}

function CallLogSkeleton() {
    return (
        <div className="flex items-center gap-4 p-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-grow space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
        </div>
    );
}
