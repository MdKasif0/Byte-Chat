import type { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  about: string;
  phone?: string;
  links?: string[];
  lastSeen: Timestamp;
  isOnline: boolean;
}

export interface Chat {
  id: string;
  members: string[];
  memberProfiles: Pick<UserProfile, 'uid' | 'displayName' | 'photoURL' | 'isOnline'>[];
  typing: string[];
  lastMessage?: Message;
  createdAt: Timestamp;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Timestamp;
  readBy: string[];
  reactions?: { [key: string]: string[] }; // emoji -> [userId]
  replyTo?: {
    messageId: string;
    senderName: string;
    content: string;
  };
  isEdited?: boolean;
}
