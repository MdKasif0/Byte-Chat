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
} from "firebase/firestore";
import { db } from "./firebase/config";
import type { Message, UserProfile } from "./types";

export async function createChat(
  currentUserId: string,
  otherUserId: string
): Promise<string> {
  // Check if a chat already exists
  const chatsRef = collection(db, "chats");
  const q = query(
    chatsRef,
    where("members", "==", [currentUserId, otherUserId].sort())
  );

  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    // Chat already exists
    return querySnapshot.docs[0].id;
  }

  // Fetch member profiles
  const userDocs = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', [currentUserId, otherUserId])));
  const memberProfiles = userDocs.docs.map(d => {
      const user = d.data() as UserProfile;
      return {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isOnline: user.isOnline
      }
  });


  // Create a new chat
  const newChatRef = await addDoc(collection(db, "chats"), {
    members: [currentUserId, otherUserId].sort(),
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
  replyTo: Message | null
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
    ...(replyTo && { replyTo: replyToData }),
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
    await updateDoc(messageRef, {
        content: 'This message was deleted.',
        isEdited: false, // Or a new field `isDeleted: true`
    });
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
