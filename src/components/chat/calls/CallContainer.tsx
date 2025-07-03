
"use client"

import 'webrtc-adapter';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, doc, Unsubscribe } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase/config';
import type { Call, CallType, UserProfile, Chat, IceCandidateData } from '@/lib/types';
import { createCall, updateCallStatus, updateCallWithAnswer, addIceCandidate } from '@/lib/chat';
import IncomingCallToast from './IncomingCallToast';
import CallView from './CallView';

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
    const [activeCall, setActiveCall] = useState<Call | null>(null);
    const [incomingCall, setIncomingCall] = useState<Call | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [callDuration, setCallDuration] = useState(0);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Effect to handle outgoing call requests from ChatWindow
    useEffect(() => {
        if (callRequest) {
            handleStartCall(callRequest.type, callRequest.calleeId);
            onCallEnded(); // Reset the request state in parent
        }
    }, [callRequest, onCallEnded]);

    // Firestore listener for incoming calls
    useEffect(() => {
        const q = query(
            collection(db, 'calls'),
            where('calleeId', '==', user.uid),
            where('status', '==', 'ringing'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const callDoc = snapshot.docs[0];
                const callData = { id: callDoc.id, ...callDoc.data() } as Call;
                // Prevent showing incoming call if already in one
                if (!activeCall) {
                    setIncomingCall(callData);
                }
            } else {
                setIncomingCall(null);
            }
        });

        return () => unsubscribe();
    }, [user.uid, activeCall]);

    const initializePeerConnection = useCallback(() => {
        const pc = new RTCPeerConnection(PEER_CONNECTION_CONFIG);

        pc.onicecandidate = (event) => {
            if (event.candidate && activeCall) {
                const role = activeCall.callerId === user.uid ? 'callerCandidates' : 'calleeCandidates';
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
            if (pc.connectionState === 'failed') {
                console.log('WebRTC connection failed, attempting to restart ICE...');
                pc.restartIce();
            }
        };

        pcRef.current = pc;
        return pc;
    }, [activeCall, user.uid]);

    const setupStream = useCallback(async (type: CallType) => {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: type === 'video',
            audio: true,
        });
        setLocalStream(stream);
        return stream;
    }, []);

    const handleStartCall = async (type: CallType, calleeId: string) => {
        if (!chat) return;
        
        const pc = initializePeerConnection();
        const stream = await setupStream(type);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const callId = await createCall(chat.id, user, calleeId, type, offer);
        setActiveCall({ id: callId, status: 'ringing', type } as Call); // Partial call object for UI

        // Listen for answer and ICE candidates
        const unsubCall = onSnapshot(doc(db, 'calls', callId), async (docSnap) => {
            const callData = docSnap.data() as Call;
            if (callData?.answer && pc.signalingState !== 'stable') {
                await pc.setRemoteDescription(new RTCSessionDescription(callData.answer));
            }
            if (callData?.status && !['ringing', 'connected'].includes(callData.status) ) {
                handleEndCall(false); // Don't update status again if remote ended
            }
            if(callData?.status === 'connected') {
                setActiveCall(prev => prev ? {...prev, status: 'connected'} : null);
            }
        });

        const unsubCandidates = onSnapshot(collection(db, 'calls', callId, 'calleeCandidates'), (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
            });
        });

        // Set a timeout for the call
        callTimeoutRef.current = setTimeout(() => {
            if (activeCall?.status === 'ringing') {
                updateCallStatus(callId, 'unanswered');
                handleEndCall(false);
            }
        }, 30000); // 30 seconds

        return () => {
            unsubCall();
            unsubCandidates();
        };
    };

    const handleAnswerCall = async () => {
        if (!incomingCall) return;
        const callId = incomingCall.id;
        setActiveCall(incomingCall);
        setIncomingCall(null);
        
        const pc = initializePeerConnection();
        const stream = await setupStream(incomingCall.type);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer!));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await updateCallWithAnswer(callId, answer);

        // Listen for ICE candidates from the caller
        onSnapshot(collection(db, 'calls', callId, 'callerCandidates'), (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                }
            });
        });
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

        pcRef.current?.close();
        pcRef.current = null;
        
        localStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setRemoteStream(null);
        setActiveCall(null);
        setCallDuration(0);
    }, [activeCall, localStream, callDuration]);

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
