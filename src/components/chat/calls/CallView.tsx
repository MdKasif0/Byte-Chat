
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { Call } from '@/lib/types';

type CallViewProps = {
    call: Call;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    onHangup: () => void;
};

export default function CallView({ call, localStream, remoteStream, onHangup }: CallViewProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(call.type === 'audio');
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [localStream, remoteStream]);
    
    // Call duration timer
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (call.status === 'connected') {
            timer = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [call.status]);

    const toggleMute = () => {
        localStream?.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsMuted(prev => !prev);
    };

    const toggleCamera = () => {
         if (call.type !== 'video') return;
        localStream?.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsCameraOff(prev => !prev);
    };
    
    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }
    
    const statusText = {
        ringing: 'Ringing...',
        connected: formatDuration(duration),
        ended: 'Call Ended',
        rejected: 'Call Rejected',
        unanswered: 'Call Unanswered',
        cancelled: 'Call Cancelled',
    }[call.status];

    return (
        <div className="fixed inset-0 z-50 bg-black/90 text-white flex flex-col">
            {/* Remote Video */}
            <div className="relative flex-1 flex items-center justify-center">
                 <AnimatePresence>
                    {remoteStream && !isCameraOff ? (
                        <motion.video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                    ) : (
                         <div className="flex flex-col items-center gap-4">
                            <Avatar className="h-32 w-32">
                                <AvatarImage src={call.callerPhotoURL} />
                                <AvatarFallback>{call.callerName?.[0]}</AvatarFallback>
                            </Avatar>
                            <h2 className="text-2xl font-bold">{call.callerName}</h2>
                            <p className="text-muted-foreground">{statusText}</p>
                         </div>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Local Video */}
            <motion.div
                drag
                dragConstraints={{ left: 0, right: window.innerWidth - 160, top: 0, bottom: window.innerHeight - 120 }}
                className={cn(
                    "absolute top-4 right-4 w-40 h-auto aspect-[3/4] rounded-lg overflow-hidden border-2 border-white/50 shadow-2xl cursor-grab active:cursor-grabbing",
                    call.type === 'audio' && 'hidden'
                )}
            >
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </motion.div>

            {/* Controls */}
            <div className="bg-black/30 backdrop-blur-sm py-4 px-6 flex justify-center items-center gap-4">
                 {call.type === 'video' && (
                    <Button variant="ghost" size="icon" onClick={toggleCamera} className={cn("rounded-full h-14 w-14 bg-white/20 hover:bg-white/30", isCameraOff && "bg-primary")}>
                        {isCameraOff ? <VideoOff /> : <Video />}
                    </Button>
                 )}
                 <Button variant="ghost" size="icon" onClick={toggleMute} className={cn("rounded-full h-14 w-14 bg-white/20 hover:bg-white/30", isMuted && "bg-primary")}>
                    {isMuted ? <MicOff /> : <Mic />}
                 </Button>
                 <Button variant="destructive" size="icon" onClick={onHangup} className="rounded-full h-14 w-14">
                    <PhoneOff />
                 </Button>
            </div>
        </div>
    );
}
