"use client";

import { useRouter } from "next/navigation";
import { collection, query, where, orderBy, or } from "firebase/firestore";
import { Phone, Video, PhoneMissed, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import type { Call } from "@/lib/types";
import { useCollection } from "@/hooks/use-collection";
import { createChat } from "@/lib/chat";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function CallsPage() {
    const { user } = useAuth();
    
    const callsQuery = user ? query(
        collection(db, "calls"), 
        or(where("callerId", "==", user.uid), where("calleeId", "==", user.uid)),
        orderBy("createdAt", "desc")
    ) : null;
    
    const { data: calls, loading } = useCollection<Call>(callsQuery);

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
                            <CallLogItem key={call.id} call={call} currentUserId={user!.uid} />
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
    const isOutgoing = call.callerId === currentUserId;
    
    const otherUser = {
        id: isOutgoing ? call.calleeId : call.callerId,
        name: isOutgoing ? call.calleeName : call.callerName,
        photoURL: isOutgoing ? call.calleePhotoURL : call.callerPhotoURL,
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
                <AvatarImage src={otherUser.photoURL} alt={otherUser.name} />
                <AvatarFallback>{otherUser.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-grow overflow-hidden">
                <h4 className={cn("font-semibold truncate", wasMissed && !isOutgoing && 'text-destructive')}>
                    {otherUser.name}
                </h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getStatusIcon()}
                    <span>
                        {call.createdAt ? formatDistanceToNow(call.createdAt.toDate(), { addSuffix: true }) : '...'}
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
