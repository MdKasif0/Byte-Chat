import type { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  status: string;
  phone?: string;
  links?: string[];
  lastSeen: Timestamp;
  isOnline: boolean;
  fcmTokens?: string[];
}

export type MemberProfile = Pick<UserProfile, 'uid' | 'displayName' | 'photoURL' | 'isOnline'>;

export interface Chat {
  id: string;
  members: string[];
  memberProfiles: MemberProfile[];
  typing: string[];
  lastMessage?: Message;
  createdAt: Timestamp;
  unreadCount?: number;
  
  // Group-specific fields
  isGroup?: boolean;
  groupName?: string;
  groupAvatarURL?: string;
  admins?: string[];
  createdBy?: string;

  // Notification settings
  mutedBy?: string[];
}

export interface Message {
  id: string;
  senderId: string;
  content: string; // Can be empty if there's a file
  timestamp: Timestamp;
  readBy: string[];
  reactions?: { [key: string]: string[] }; // emoji -> [userId]
  replyTo?: {
    messageId: string;
    senderName: string;
    content: string;
  };
  isEdited?: boolean;
  // File attachment fields
  fileURL?: string;
  fileName?: string;
  fileType?: string;
  isClip?: boolean;
}
