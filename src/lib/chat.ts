
"use server";

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  where,
  deleteDoc,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase/config";
import type { Message, UserProfile, Call, CallType, IceCandidateData } from "./types";

export async function createChat(
  currentUserId: string,
  otherUserId: string
): Promise<string> {
  // Create a predictable, unique chat ID for the two users by sorting their UIDs
  const members = [currentUserId, otherUserId].sort();
  const chatId = members.join('_');
  
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);

  if (chatSnap.exists()) {
    // Chat already exists, return its ID
    return chatSnap.id;
  }
  
  // If chat doesn't exist, create it.
  // Fetch the profiles for the members to store them in the chat document.
  const userDocs = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', members)));
  const memberProfiles = userDocs.docs.map(d => {
      const user = d.data() as UserProfile;
      return {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isOnline: user.isOnline
      }
  });

  // Create a new chat document using the predictable ID
  await setDoc(chatRef, {
    members: members,
    memberProfiles,
    typing: [],
    createdAt: serverTimestamp(),
    isGroup: false,
    mutedBy: [],
  });

  return chatId;
}

export async function createGroupChat(creatorId: string, memberIds: string[], groupName: string) {
    const allMemberIds = Array.from(new Set([creatorId, ...memberIds]));
    
    const userDocs = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', allMemberIds)));
    const memberProfiles = userDocs.docs.map(d => {
        const user = d.data() as UserProfile;
        return {
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL,
            isOnline: user.isOnline,
        }
    });

    const newChatRef = await addDoc(collection(db, "chats"), {
        groupName,
        groupAvatarURL: `https://placehold.co/200x200.png?text=${groupName.charAt(0).toUpperCase()}`,
        isGroup: true,
        createdBy: creatorId,
        admins: [creatorId],
        members: allMemberIds,
        memberProfiles,
        typing: [],
        createdAt: serverTimestamp(),
    });

    return newChatRef.id;
}


export async function createMessage(
  chatId: string,
  senderId: string,
  content: string,
  replyTo: Message | null,
  fileInfo?: { url: string; name: string; type: string; isClip?: boolean; }
) {
  const chatRef = doc(db, "chats", chatId);
  const messagesRef = collection(chatRef, "messages");
  
  let replyToData;
  if (replyTo) {
    const senderDoc = await getDoc(doc(db, "users", replyTo.senderId));
    const senderName = senderDoc.exists() ? senderDoc.data().displayName : "User";
    replyToData = {
        messageId: replyTo.id,
        senderName: senderName,
        content: replyTo.content,
    }
  }

  const newMessage: Omit<Message, 'id'> = {
    senderId,
    content,
    timestamp: serverTimestamp() as any, // Cast because serverTimestamp is a sentinel value
    readBy: [senderId],
    reactions: {},
    starredBy: [],
    ...(replyTo && { replyTo: replyToData }),
    ...(fileInfo && { 
        fileURL: fileInfo.url, 
        fileName: fileInfo.name, 
        fileType: fileInfo.type,
        isClip: !!fileInfo.isClip,
    }),
  };

  const messageRef = await addDoc(messagesRef, newMessage);

  await updateDoc(chatRef, {
      lastMessage: {
          id: messageRef.id,
          ...newMessage
      }
  });
}

export async function setTypingStatus(
  chatId: string,
  userId: string,
  isTyping: boolean
) {
  const chatRef = doc(db, "chats", chatId);
  if (isTyping) {
    await updateDoc(chatRef, { typing: arrayUnion(userId) });
  } else {
    await updateDoc(chatRef, { typing: arrayRemove(userId) });
  }
}

export async function markChatAsRead(chatId: string, userId: string) {
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const q = query(messagesRef, where('readBy', 'not-in', [[userId]]));
    const unreadMessages = await getDocs(q);

    const batch = writeBatch(db);
    unreadMessages.forEach(messageDoc => {
        if (messageDoc.data().senderId !== userId) {
            batch.update(messageDoc.ref, {
                readBy: arrayUnion(userId)
            });
        }
    });

    await batch.commit();
}

export async function findUserByPhoneNumber(phoneNumber: string) {
    const phoneNumberRef = doc(db, 'phonenumbers', phoneNumber);
    const phoneNumberSnap = await getDoc(phoneNumberRef);

    if (phoneNumberSnap.exists()) {
        const { uid } = phoneNumberSnap.data();
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            return userSnap.data() as UserProfile;
        }
    }
    return null;
}

export async function updateMessage(chatId: string, messageId: string, newContent: string) {
    const messageRef = doc(db, `chats/${chatId}/messages`, messageId);
    await updateDoc(messageRef, {
        content: newContent,
        isEdited: true
    });
}

export async function deleteMessage(chatId: string, messageId: string) {
    const messageRef = doc(db, `chats/${chatId}/messages`, messageId);
    await deleteDoc(messageRef);
}

export async function toggleReaction(chatId: string, messageId: string, emoji: string, userId: string) {
    const messageRef = doc(db, `chats/${chatId}/messages`, messageId);
    const messageSnap = await getDoc(messageRef);

    if (messageSnap.exists()) {
        const messageData = messageSnap.data();
        const reactions = messageData.reactions || {};
        const existingReactionUsers = reactions[emoji] || [];

        if (existingReactionUsers.includes(userId)) {
            // User is removing their reaction
            await updateDoc(messageRef, {
                [`reactions.${emoji}`]: arrayRemove(userId)
            });
        } else {
            // User is adding a reaction
            await updateDoc(messageRef, {
                [`reactions.${emoji}`]: arrayUnion(userId)
            });
        }
    }
}


export async function removeMemberFromGroup(chatId: string, memberId: string) {
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists() || !chatSnap.data().isGroup) return;

    const memberProfileToRemove = chatSnap.data().memberProfiles.find((p: UserProfile) => p.uid === memberId);

    await updateDoc(chatRef, {
        members: arrayRemove(memberId),
        admins: arrayRemove(memberId),
        memberProfiles: arrayRemove(memberProfileToRemove),
    });
}

export async function promoteToAdmin(chatId: string, memberId: string) {
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
        admins: arrayUnion(memberId)
    });
}

export async function demoteToAdmin(chatId: string, memberId: string) {
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
        admins: arrayRemove(memberId)
    });
}

export async function toggleMuteChat(chatId: string, userId: string, shouldMute: boolean) {
    const chatRef = doc(db, "chats", chatId);
    if (shouldMute) {
        await updateDoc(chatRef, {
            mutedBy: arrayUnion(userId)
        });
    } else {
        await updateDoc(chatRef, {
            mutedBy: arrayRemove(userId)
        });
    }
}

export async function updateChatWallpaper(chatId: string, wallpaperURL: string) {
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, { wallpaperURL });
}

export async function toggleStarMessage(chatId: string, messageId: string, userId: string) {
    const messageRef = doc(db, `chats/${chatId}/messages`, messageId);
    const messageSnap = await getDoc(messageRef);

    if (messageSnap.exists()) {
        const messageData = messageSnap.data();
        const starredBy = messageData.starredBy || [];

        if (starredBy.includes(userId)) {
            await updateDoc(messageRef, {
                starredBy: arrayRemove(userId)
            });
        } else {
            await updateDoc(messageRef, {
                starredBy: arrayUnion(userId)
            });
        }
    }
}

// Call Signaling Functions

export async function createCall(
    chatId: string,
    caller: UserProfile,
    calleeId: string,
    type: CallType,
    offer: RTCSessionDescriptionInit
): Promise<string> {
    const calleeDoc = await getDoc(doc(db, 'users', calleeId));
    const callee = calleeDoc.data() as UserProfile | undefined;

    const callData: Omit<Call, 'id'> = {
        chatId,
        callerId: caller.uid,
        callerName: caller.displayName,
        callerPhotoURL: caller.photoURL,
        calleeId,
        calleeName: callee?.displayName,
        calleePhotoURL: callee?.photoURL,
        status: 'ringing',
        type,
        offer: {
            sdp: offer.sdp!,
            type: offer.type!,
        },
        createdAt: serverTimestamp() as Timestamp,
    };
    const callDocRef = await addDoc(collection(db, 'calls'), callData);
    return callDocRef.id;
}


export async function updateCallWithAnswer(callId: string, answer: RTCSessionDescriptionInit) {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
        status: 'connected',
        connectedAt: serverTimestamp(),
        answer: {
            sdp: answer.sdp!,
            type: answer.type!,
        }
    });
}

export async function updateCallStatus(callId: string, status: Call['status'], duration?: number) {
    const callRef = doc(db, 'calls', callId);
    const payload: { status: Call['status'], endedAt?: any, duration?: number } = { status };
    if (status === 'ended' || status === 'rejected' || status === 'unanswered' || status === 'cancelled') {
        payload.endedAt = serverTimestamp();
        if (duration !== undefined) {
            payload.duration = duration;
        }
    }
    await updateDoc(callRef, payload);
}

export async function addIceCandidate(callId: string, collectionName: 'callerCandidates' | 'calleeCandidates', candidate: RTCIceCandidate) {
    const candidatesRef = collection(db, 'calls', callId, collectionName);
    await addDoc(candidatesRef, candidate.toJSON());
}
