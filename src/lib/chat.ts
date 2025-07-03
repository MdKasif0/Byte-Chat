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
    where("isGroup", "==", false),
    where("members", "==", [currentUserId, otherUserId].sort())
  );

  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    // Chat already exists
    return querySnapshot.docs[0].id;
  }
  
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
    isGroup: false,
  });

  return newChatRef.id;
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
  fileInfo?: { url: string; name: string; type: string }
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
    ...(fileInfo && { fileURL: fileInfo.url, fileName: fileInfo.name, fileType: fileInfo.type }),
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
    // Instead of updating, we'll make this a hard delete for simplicity,
    // though a soft delete (updating content) is also a valid strategy.
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
