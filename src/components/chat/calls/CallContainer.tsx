
"use client"

import 'webrtc-adapter';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { Call, CallType, UserProfile, Chat, IceCandidateData } from '@/lib/types';
import { createCall, updateCallStatus, updateCallWithAnswer, addIceCandidate } from '@/lib/chat';
import IncomingCallToast from './IncomingCallToast';
import CallView from './CallView';
import { RealtimeChannel } from '@supabase/supabase-js';

const PEER_CONNECTION_CONFIG: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

type CallContainerProps = {
    user: UserProfile;
    chat: Chat;
    callRequest: { type: CallType, calleeId: string } | null;
    onCallEnded: () => void;
};

export default function CallContainer({ user, chat, callRequest, onCallEnded }: CallContainerProps) {
    const { toast } = useToast();
    const supabase = createClient();
    const [activeCall, setActiveCall] = useState<Call | null>(null);
    const [incomingCall, setIncomingCall] = useState<Call | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [callDuration, setCallDuration] = useState(0);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const callChannelRef = useRef<RealtimeChannel | null>(null);
    const iceCandidateChannelRef = useRef<RealtimeChannel | null>(null);

    // Effect to handle outgoing call requests from ChatWindow
    useEffect(() => {
        if (callRequest) {
            handleStartCall(callRequest.type, callRequest.calleeId);
            onCallEnded(); // Reset the request state in parent
        }
    }, [callRequest, onCallEnded]);

    // Supabase listener for incoming calls
    useEffect(() => {
        const channel = supabase.channel(`incoming-calls-for-${user.id}`)
            .on<Call>('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'calls',
                filter: `callee_id=eq.${user.id}`
            }, (payload) => {
                const newCall = payload.new;
                if (newCall.status === 'ringing' && !activeCall) {
                    setIncomingCall(newCall);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user.id, activeCall, supabase]);

    const initializePeerConnection = useCallback(() => {
        if (pcRef.current) {
            pcRef.current.close();
        }
        const pc = new RTCPeerConnection(PEER_CONNECTION_CONFIG);

        pc.onicecandidate = (event) => {
            if (event.candidate && activeCall) {
                const role = activeCall.caller_id === user.id ? 'caller' : 'callee';
                addIceCandidate(activeCall.id, role, event.candidate);
            }
        };

        pc.ontrack = (event) => {
            const stream = event.streams[0];
            if (stream) {
                setRemoteStream(stream);
            }
        };
        
        pc.onconnectionstatechange = () => {
             if (pcRef.current) {
                console.log(`WebRTC Connection State: ${pcRef.current.connectionState}`);
                if (pcRef.current.connectionState === 'failed') {
                    pcRef.current.restartIce();
                } else if (pcRef.current.connectionState === 'disconnected') {
                    handleEndCall(false);
                }
            }
        };

        pcRef.current = pc;
        return pc;
    }, [activeCall, user.id]);

    const setupStream = useCallback(async (type: CallType) => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
            video: type === 'video',
            audio: true,
        });
        setLocalStream(stream);
        return stream;
    }, [localStream]);

    const handleStartCall = async (type: CallType, calleeId: string) => {
        if (!chat) return;
        
        const pc = initializePeerConnection();
        const stream = await setupStream(type);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const callId = await createCall(chat.id, user, calleeId, type, offer);
        setActiveCall({ id: callId, status: 'ringing', type, caller_id: user.id, callee_id: calleeId } as Call);

        // Listen for answer and ICE candidates
        callChannelRef.current = supabase.channel(`call-${callId}`)
            .on<Call>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls', filter: `id=eq.${callId}`}, async (payload) => {
                const callData = payload.new;
                if (callData?.answer && pc.signalingState !== 'stable') {
                    await pc.setRemoteDescription(new RTCSessionDescription(callData.answer as RTCSessionDescriptionInit));
                }
                if (callData?.status && !['ringing', 'connected'].includes(callData.status) ) {
                    handleEndCall(false);
                }
                if(callData?.status === 'connected') {
                    setActiveCall(prev => prev ? {...prev, status: 'connected'} : null);
                }
            })
            .subscribe();

        iceCandidateChannelRef.current = supabase.channel(`ice-${callId}-callee`)
            .on<IceCandidateData>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ice_candidates', filter: `call_id=eq.${callId}`}, (payload) => {
                 if (payload.new.sender !== user.id) {
                    pc.addIceCandidate(new RTCIceCandidate(payload.new.candidate as RTCIceCandidateInit));
                 }
            })
            .subscribe();

        callTimeoutRef.current = setTimeout(() => {
            if (activeCall?.status === 'ringing') {
                updateCallStatus(callId, 'unanswered');
                handleEndCall(false);
            }
        }, 30000); // 30 seconds
    };

    const handleAnswerCall = async () => {
        if (!incomingCall) return;
        const callId = incomingCall.id;
        setActiveCall(incomingCall);
        setIncomingCall(null);
        
        const pc = initializePeerConnection();
        const stream = await setupStream(incomingCall.type);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer as RTCSessionDescriptionInit));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await updateCallWithAnswer(callId, answer);

        // Listen for ICE candidates from the caller
        iceCandidateChannelRef.current = supabase.channel(`ice-${callId}-caller`)
            .on<IceCandidateData>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ice_candidates', filter: `call_id=eq.${callId}`}, (payload) => {
                 if (payload.new.sender !== user.id) {
                    pc.addIceCandidate(new RTCIceCandidate(payload.new.candidate as RTCIceCandidateInit));
                 }
            })
            .subscribe();
    };

    const handleRejectCall = async () => {
        if (incomingCall) {
            await updateCallStatus(incomingCall.id, 'rejected');
            setIncomingCall(null);
            toast({ title: 'Call Rejected' });
        }
    };

    const handleEndCall = useCallback((updateStatus = true) => {
        if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);

        if (updateStatus && activeCall) {
            updateCallStatus(activeCall.id, 'ended', callDuration);
        }

        if (callChannelRef.current) supabase.removeChannel(callChannelRef.current);
        if (iceCandidateChannelRef.current) supabase.removeChannel(iceCandidateChannelRef.current);

        pcRef.current?.close();
        pcRef.current = null;
        
        localStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setRemoteStream(null);
        setActiveCall(null);
        setCallDuration(0);
    }, [activeCall, localStream, callDuration, supabase]);

    return (
        <>
            {incomingCall && !activeCall && (
                <IncomingCallToast
                    call={incomingCall}
                    onAccept={handleAnswerCall}
                    onReject={handleRejectCall}
                />
            )}
            {activeCall && (
                <CallView
                    call={activeCall}
                    localStream={localStream}
                    remoteStream={remoteStream}
                    onHangup={() => handleEndCall(true)}
                    duration={callDuration}
                    setDuration={setCallDuration}
                />
            )}
        </>
    );
}
