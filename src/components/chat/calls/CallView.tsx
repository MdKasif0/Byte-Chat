
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, ArrowLeft, Expand, RotateCw, Upload } from 'lucide-react';
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
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }
    
    const statusText = {
        ringing: 'Ringing...',
        connected: 'Connected',
        ended: 'Call Ended',
        rejected: 'Call Rejected',
        unanswered: 'Call Unanswered',
        cancelled: 'Call Cancelled',
    }[call.status];

    return (
        <div className="fixed inset-0 z-50 bg-black text-white flex flex-col">
            {/* Remote Video */}
            <AnimatePresence>
                {remoteStream ? (
                    <motion.video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />
                ) : (
                    <div className="absolute inset-0 w-full h-full bg-slate-900" />
                )}
            </AnimatePresence>

            {/* Gradient Overlay for UI readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50" />

            {/* Header Controls */}
            <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 mt-8">
                 <Button onClick={onHangup} variant="ghost" size="icon" className="rounded-full bg-black/20 hover:bg-black/40 text-white">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full bg-black/20 hover:bg-black/40 text-white">
                    <Expand className="h-6 w-6" />
                </Button>
            </header>

            {/* Status Text (when no remote video) */}
            <div className="relative flex-1 flex items-center justify-center">
                 <AnimatePresence>
                    {!remoteStream && (
                         <motion.div 
                            className="flex flex-col items-center gap-4 text-center"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                         >
                            <Avatar className="h-32 w-32 border-4 border-white/20">
                                <AvatarImage src={call.callerPhotoURL} />
                                <AvatarFallback>{call.callerName?.[0]}</AvatarFallback>
                            </Avatar>
                            <h2 className="text-3xl font-bold">{call.callerName}</h2>
                            <p className="text-lg text-white/80">{statusText}</p>
                         </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Local Video */}
            <AnimatePresence>
            {call.type === 'video' && localStream && (
                <motion.div
                    drag
                    dragConstraints={{ left: 8, right: window.innerWidth - 120, top: 8, bottom: window.innerHeight - 200 }}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-32 right-4 w-28 h-auto aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/50 shadow-2xl cursor-grab active:cursor-grabbing z-10"
                >
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </motion.div>
            )}
            </AnimatePresence>

            {/* Bottom Controls */}
            <footer className="relative p-6 z-10 mb-4">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                    className="flex items-center justify-center"
                >
                    <div className="flex items-center gap-3 bg-gray-800/60 backdrop-blur-xl p-3 rounded-full shadow-lg border border-white/10">
                        <Button variant="ghost" size="icon" className="rounded-full bg-white/10 hover:bg-white/20 h-12 w-12 text-white">
                            <RotateCw />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full bg-white/10 hover:bg-white/20 h-12 w-12 text-white">
                            <Upload />
                        </Button>
                        {call.type === 'video' && (
                            <Button variant="ghost" size="icon" onClick={toggleCamera} className={cn("rounded-full h-12 w-12 text-white", isCameraOff ? "bg-white text-black hover:bg-gray-200" : "bg-white/10 hover:bg-white/20")}>
                                {isCameraOff ? <VideoOff /> : <Video />}
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={toggleMute} className={cn("rounded-full h-12 w-12 text-white", isMuted ? "bg-white text-black hover:bg-gray-200" : "bg-white/10 hover:bg-white/20")}>
                            {isMuted ? <MicOff /> : <Mic />}
                        </Button>
                        <Button onClick={onHangup} className="rounded-full h-12 bg-red-500 hover:bg-red-600 px-5 text-white text-base">
                            <Phone className="mr-2 h-5 w-5"/>
                            <span>{call.status === 'connected' ? formatDuration(duration) : ''}</span>
                        </Button>
                    </div>
                </motion.div>
            </footer>
        </div>
    );
}
