
export interface Profile {
  id: string;
  display_name: string;
  email: string;
  photo_url: string;
  status: string;
  phone?: string;
  links?: string[];
  last_seen: string;
  is_online: boolean;
  fcm_tokens?: string[];
}

export type MemberProfile = Pick<Profile, 'id' | 'display_name' | 'photo_url' | 'is_online'>;

export interface Chat {
  id: string;
  members: string[];
  member_profiles: MemberProfile[];
  typing: string[];
  last_message?: Message;
  created_at: string;
  wallpaper_url?: string;
  
  is_group: boolean;
  group_name?: string;
  group_avatar_url?: string;
  admins?: string[];
  created_by?: string;

  muted_by?: string[];
}

export interface Message {
  id: string;
  sender_id: string;
  chat_id: string;
  content: string; 
  created_at: string;
  read_by: string[];
  reactions?: { [key: string]: string[] }; 
  reply_to?: {
    message_id: string;
    sender_name: string;
    content: string;
  };
  is_edited?: boolean;
  starred_by?: string[];
  
  file_url?: string;
  file_name?: string;
  file_type?: string;
  is_clip?: boolean;
}

export type CallType = 'video' | 'audio';

export interface Call {
  id: string;
  chat_id: string;
  caller_id: string;
  caller_name: string;
  caller_photo_url: string;
  callee_id: string;
  callee_name?: string;
  callee_photo_url?: string;
  status: 'ringing' | 'connected' | 'rejected' | 'ended' | 'unanswered' | 'cancelled';
  type: CallType;
  offer?: { sdp: string; type: 'offer' };
  answer?: { sdp: string; type: 'answer' };
  created_at: string;
  connected_at?: string;
  ended_at?: string;
  duration?: number;
}

export interface IceCandidateData {
    call_id: string;
    sender: 'caller' | 'callee';
    candidate: RTCIceCandidateInit;
}
