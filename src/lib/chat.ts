
"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Message, UserProfile, Call, CallType, IceCandidateData } from "./types";
import type { Database } from "./supabase/database.types";


export async function createChat(
  currentUserId: string,
  otherUserId: string
): Promise<string> {
  const supabase = createServerActionClient<Database>({ cookies });
  const members = [currentUserId, otherUserId].sort();
  const chatId = members.join('_');

  const { data: existingChat, error: existingChatError } = await supabase
    .from('chats')
    .select('id')
    .eq('id', chatId)
    .single();

  if (existingChat) {
    return existingChat.id;
  }
  
  const { data: userProfiles, error: userProfilesError } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url, is_online')
    .in('id', members);
  
  if (userProfilesError) {
    console.error("Error fetching user profiles:", userProfilesError);
    throw new Error("Could not fetch user profiles.");
  }

  const { error: createChatError } = await supabase.from('chats').insert({
    id: chatId,
    members: members,
    member_profiles: userProfiles,
    is_group: false,
    muted_by: [],
    typing: [],
  });

  if (createChatError) {
      console.error("Error creating chat:", createChatError);
      throw new Error("Could not create chat.");
  }

  return chatId;
}

export async function createGroupChat(creatorId: string, memberIds: string[], groupName: string) {
    const supabase = createServerActionClient<Database>({ cookies });
    const allMemberIds = Array.from(new Set([creatorId, ...memberIds]));
    
    const { data: userProfiles, error: userProfilesError } = await supabase
        .from('profiles')
        .select('id, display_name, photo_url, is_online')
        .in('id', allMemberIds);
    
    if (userProfilesError) {
        console.error("Error fetching user profiles for group:", userProfilesError);
        throw new Error("Could not fetch user profiles for group.");
    }
    
    const { data: newChat, error: createChatError } = await supabase.from('chats').insert({
        group_name: groupName,
        group_avatar_url: `https://placehold.co/200x200.png?text=${groupName.charAt(0).toUpperCase()}`,
        is_group: true,
        created_by: creatorId,
        admins: [creatorId],
        members: allMemberIds,
        member_profiles: userProfiles,
        typing: [],
        muted_by: [],
    }).select('id').single();

    if (createChatError || !newChat) {
        console.error("Error creating group chat:", createChatError);
        throw new Error("Could not create group chat.");
    }

    return newChat.id;
}


export async function createMessage(
  chatId: string,
  senderId: string,
  content: string,
  replyTo: Message | null,
  fileInfo?: { url: string; name: string; type: string; isClip?: boolean; }
) {
  const supabase = createServerActionClient<Database>({ cookies });
  
  let replyToData;
  if (replyTo) {
    const { data: senderProfile } = await supabase.from('profiles').select('display_name').eq('id', replyTo.sender_id).single();
    replyToData = {
        message_id: replyTo.id,
        sender_name: senderProfile?.display_name || "User",
        content: replyTo.content,
    }
  }

  const { data: newMessage, error: messageError } = await supabase.from('messages').insert({
    chat_id: chatId,
    sender_id: senderId,
    content: content || '',
    read_by: [senderId],
    reactions: {},
    starred_by: [],
    reply_to: replyToData,
    file_url: fileInfo?.url,
    file_name: fileInfo?.name,
    file_type: fileInfo?.type,
    is_clip: fileInfo?.isClip,
  }).select().single();

  if (messageError) {
      console.error("Error creating message:", messageError);
      throw new Error("Could not send message.");
  }

  await supabase.from('chats').update({
      last_message: newMessage,
  }).eq('id', chatId);
}

export async function setTypingStatus(
  chatId: string,
  userId: string,
  isTyping: boolean
) {
  const supabase = createServerActionClient<Database>({ cookies });
  const { data: chat } = await supabase.from('chats').select('typing').eq('id', chatId).single();
  if (!chat) return;

  const currentTyping = chat.typing || [];
  let newTyping = [...currentTyping];

  if (isTyping && !currentTyping.includes(userId)) {
    newTyping.push(userId);
  } else if (!isTyping) {
    newTyping = newTyping.filter(id => id !== userId);
  }
  
  if (newTyping.length !== currentTyping.length || !newTyping.every((val, index) => val === currentTyping[index])) {
    await supabase.from('chats').update({ typing: newTyping }).eq('id', chatId);
  }
}

export async function markChatAsRead(chatId: string, userId: string) {
    const supabase = createServerActionClient<Database>({ cookies });
    // This is a complex operation that's better handled client-side or with a database function.
    // For now, we'll leave this as a placeholder.
    // A proper implementation would fetch unread messages and update their `read_by` arrays.
    console.log(`Marking chat ${chatId} as read for user ${userId}`);
}

export async function findUserByPhoneNumber(phoneNumber: string): Promise<UserProfile | null> {
    const supabase = createServerActionClient<Database>({ cookies });
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phoneNumber)
        .single();

    if (error || !data) {
        return null;
    }
    return data;
}

export async function updateMessage(chatId: string, messageId: string, newContent: string) {
    const supabase = createServerActionClient<Database>({ cookies });
    await supabase.from('messages').update({
        content: newContent,
        is_edited: true
    }).eq('id', messageId);
}

export async function deleteMessage(chatId: string, messageId: string) {
    const supabase = createServerActionClient<Database>({ cookies });
    await supabase.from('messages').delete().eq('id', messageId);
}

export async function toggleReaction(chatId: string, messageId: string, emoji: string, userId: string) {
    const supabase = createServerActionClient<Database>({ cookies });
    // This requires a database function (`rpc`) for safe atomic updates.
    // The simplified client-side logic below is prone to race conditions.
    const { data: message } = await supabase.from('messages').select('reactions').eq('id', messageId).single();
    if (!message) return;

    const reactions = (message.reactions as Record<string, string[]>) || {};
    const existingReactionUsers = reactions[emoji] || [];

    if (existingReactionUsers.includes(userId)) {
        reactions[emoji] = existingReactionUsers.filter(id => id !== userId);
    } else {
        reactions[emoji] = [...existingReactionUsers, userId];
    }
    
    // Remove emojis with no users
    if (reactions[emoji].length === 0) {
        delete reactions[emoji];
    }

    await supabase.from('messages').update({ reactions }).eq('id', messageId);
}


export async function removeMemberFromGroup(chatId: string, memberId: string) {
    const supabase = createServerActionClient<Database>({ cookies });
    // This also requires a database function for atomicity and permission checks.
    const { data: chat } = await supabase.from('chats').select('members, admins, member_profiles').eq('id', chatId).single();
    if (!chat || !chat.is_group) return;

    const newMembers = chat.members.filter(id => id !== memberId);
    const newAdmins = (chat.admins || []).filter(id => id !== memberId);
    const newMemberProfiles = (chat.member_profiles || []).filter(p => p.id !== memberId);

    await supabase.from('chats').update({
        members: newMembers,
        admins: newAdmins,
        member_profiles: newMemberProfiles,
    }).eq('id', chatId);
}

export async function promoteToAdmin(chatId: string, memberId: string) {
    const supabase = createServerActionClient<Database>({ cookies });
    const { data: chat } = await supabase.from('chats').select('admins').eq('id', chatId).single();
    if (!chat) return;
    const currentAdmins = chat.admins || [];
    if (!currentAdmins.includes(memberId)) {
        await supabase.from('chats').update({ admins: [...currentAdmins, memberId] }).eq('id', chatId);
    }
}

export async function demoteToAdmin(chatId: string, memberId: string) {
    const supabase = createServerActionClient<Database>({ cookies });
    const { data: chat } = await supabase.from('chats').select('admins').eq('id', chatId).single();
    if (!chat || !chat.admins) return;
    const newAdmins = chat.admins.filter(id => id !== memberId);
    await supabase.from('chats').update({ admins: newAdmins }).eq('id', chatId);
}

export async function toggleMuteChat(chatId: string, userId: string, shouldMute: boolean) {
    const supabase = createServerActionClient<Database>({ cookies });
    const { data: chat } = await supabase.from('chats').select('muted_by').eq('id', chatId).single();
    if (!chat) return;

    const mutedBy = chat.muted_by || [];
    let newMutedBy = [...mutedBy];

    if (shouldMute && !mutedBy.includes(userId)) {
        newMutedBy.push(userId);
    } else if (!shouldMute) {
        newMutedBy = newMutedBy.filter(id => id !== userId);
    }

    await supabase.from('chats').update({ muted_by: newMutedBy }).eq('id', chatId);
}

export async function updateChatWallpaper(chatId: string, wallpaperURL: string) {
    const supabase = createServerActionClient<Database>({ cookies });
    await supabase.from('chats').update({ wallpaper_url: wallpaperURL }).eq('id', chatId);
}

export async function toggleStarMessage(chatId: string, messageId: string, userId: string) {
    const supabase = createServerActionClient<Database>({ cookies });
     const { data: message } = await supabase.from('messages').select('starred_by').eq('id', messageId).single();
    if (!message) return;

    const starredBy = message.starred_by || [];
    let newStarredBy = [...starredBy];

    if (starredBy.includes(userId)) {
        newStarredBy = starredBy.filter(id => id !== userId);
    } else {
        newStarredBy.push(userId);
    }

    await supabase.from('messages').update({ starred_by: newStarredBy }).eq('id', messageId);
}

// Call Signaling Functions

export async function createCall(
    chatId: string,
    caller: UserProfile,
    calleeId: string,
    type: CallType,
    offer: RTCSessionDescriptionInit
): Promise<string> {
    const supabase = createServerActionClient<Database>({ cookies });
    const { data: callee } = await supabase.from('profiles').select('display_name, photo_url').eq('id', calleeId).single();

    const { data: newCall, error } = await supabase.from('calls').insert({
        chat_id: chatId,
        caller_id: caller.id,
        caller_name: caller.display_name,
        caller_photo_url: caller.photo_url,
        callee_id: calleeId,
        callee_name: callee?.display_name,
        callee_photo_url: callee?.photo_url,
        status: 'ringing',
        type: type,
        offer: {
            sdp: offer.sdp!,
            type: offer.type!,
        },
    }).select('id').single();
    
    if (error || !newCall) {
        console.error("Error creating call:", error);
        throw new Error("Could not create call.");
    }

    return newCall.id;
}


export async function updateCallWithAnswer(callId: string, answer: RTCSessionDescriptionInit) {
    const supabase = createServerActionClient<Database>({ cookies });
    await supabase.from('calls').update({
        status: 'connected',
        connected_at: new Date().toISOString(),
        answer: {
            sdp: answer.sdp!,
            type: answer.type!,
        }
    }).eq('id', callId);
}

export async function updateCallStatus(callId: string, status: Call['status'], duration?: number) {
    const supabase = createServerActionClient<Database>({ cookies });
    const payload: Partial<Call> = { status };
    if (status === 'ended' || status === 'rejected' || status === 'unanswered' || status === 'cancelled') {
        payload.ended_at = new Date().toISOString();
        if (duration !== undefined) {
            payload.duration = duration;
        }
    }
    await supabase.from('calls').update(payload).eq('id', callId);
}

export async function addIceCandidate(callId: string, role: 'caller' | 'callee', candidate: RTCIceCandidate) {
    const supabase = createServerActionClient<Database>({ cookies });
    // In a real app, you'd store candidates in a separate table or a jsonb column
    // For simplicity, we're not fully implementing this part.
    console.log(`Adding ICE candidate for ${role} in call ${callId}`);
}
