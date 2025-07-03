"use client";

import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app, db } from "./config";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

async function saveTokenToDb(userId: string, token: string) {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const userData = userDoc.data();
        const existingTokens = userData.fcmTokens || [];
        if (!existingTokens.includes(token)) {
            await updateDoc(userDocRef, {
                fcmTokens: arrayUnion(token)
            });
            console.log("FCM token saved to user profile.");
        } else {
            console.log("FCM token already exists for this user.");
        }
    } else {
        console.warn("User document not found. Could not save FCM token.");
    }
}


export async function requestPermissionAndToken(userId: string) {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
        console.log("This browser does not support desktop notification or service workers.");
        return null;
    }

    try {
        const messaging = getMessaging(app);

        // Handle foreground messages
        onMessage(messaging, (payload) => {
            console.log('Message received in foreground.', payload);
            // Show an in-app notification/toast
            // This could be enhanced with a custom component
            const { toast } = useToast();
            toast({
                title: payload.notification?.title,
                description: payload.notification?.body,
            })
        });

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted.');

            const currentToken = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            });

            if (currentToken) {
                console.log('FCM Token:', currentToken);
                await saveTokenToDb(userId, currentToken);
                return currentToken;
            } else {
                console.log('No registration token available. Request permission to generate one.');
            }
        } else {
            console.log('Unable to get permission to notify.');
        }

    } catch (err) {
        console.error('An error occurred while retrieving token or setting up foreground message handler. ', err);
    }
    
    return null;
}
