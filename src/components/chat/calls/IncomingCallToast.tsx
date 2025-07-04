
"use client";

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Phone, PhoneOff } from 'lucide-react';

import type { Call } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

type IncomingCallToastProps = {
    call: Call;
    onAccept: () => void;
    onReject: () => void;
};

export default function IncomingCallToast({ call, onAccept, onReject }: IncomingCallToastProps) {

    useEffect(() => {
        if ('vibrate' in navigator) {
            // Vibrate repeatedly
            const interval = setInterval(() => navigator.vibrate([400, 200, 400]), 1000);
            return () => {
                clearInterval(interval);
                navigator.vibrate(0); // Stop vibrating
            };
        }
    }, []);

    return (
        <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm rounded-xl bg-card/80 backdrop-blur-lg p-4 shadow-2xl border"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={call.caller_photo_url} alt={call.caller_name} />
                        <AvatarFallback>{call.caller_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-bold">{call.caller_name}</p>
                        <p className="text-sm text-muted-foreground">Incoming {call.type} call...</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="icon" variant="destructive" onClick={onReject}>
                        <PhoneOff className="h-5 w-5" />
                    </Button>
                    <Button size="icon" className="bg-green-500 hover:bg-green-600" onClick={onAccept}>
                        <Phone className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
