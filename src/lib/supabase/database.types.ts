export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      calls: {
        Row: {
          answer: Json | null
          callee_id: string
          callee_name: string | null
          callee_photo_url: string | null
          caller_id: string
          caller_name: string
          caller_photo_url: string
          chat_id: string
          connected_at: string | null
          created_at: string
          duration: number | null
          ended_at: string | null
          id: string
          offer: Json | null
          status: string
          type: string
        }
        Insert: {
          answer?: Json | null
          callee_id: string
          callee_name?: string | null
          callee_photo_url?: string | null
          caller_id: string
          caller_name: string
          caller_photo_url: string
          chat_id: string
          connected_at?: string | null
          created_at?: string
          duration?: number | null
          ended_at?: string | null
          id?: string
          offer?: Json | null
          status: string
          type: string
        }
        Update: {
          answer?: Json | null
          callee_id?: string
          callee_name?: string | null
          callee_photo_url?: string | null
          caller_id?: string
          caller_name?: string
          caller_photo_url?: string
          chat_id?: string
          connected_at?: string | null
          created_at?: string
          duration?: number | null
          ended_at?: string | null
          id?: string
          offer?: Json | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_callee_id_fkey"
            columns: ["callee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          admins: string[] | null
          created_at: string
          created_by: string | null
          group_avatar_url: string | null
          group_name: string | null
          id: string
          is_group: boolean
          last_message: Json | null
          member_profiles: Json | null
          members: string[]
          muted_by: string[] | null
          typing: string[] | null
          wallpaper_url: string | null
        }
        Insert: {
          admins?: string[] | null
          created_at?: string
          created_by?: string | null
          group_avatar_url?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean
          last_message?: Json | null
          member_profiles?: Json | null
          members: string[]
          muted_by?: string[] | null
          typing?: string[] | null
          wallpaper_url?: string | null
        }
        Update: {
          admins?: string[] | null
          created_at?: string
          created_by?: string | null
          group_avatar_url?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean
          last_message?: Json | null
          member_profiles?: Json | null
          members?: string[]
          muted_by?: string[] | null
          typing?: string[] | null
          wallpaper_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: number
          rating: number
          report: string
          user_agent: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          rating: number
          report: string
          user_agent: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          rating?: number
          report?: string
          user_agent?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_clip: boolean | null
          is_edited: boolean | null
          read_by: string[] | null
          reactions: Json | null
          reply_to: Json | null
          sender_id: string
          starred_by: string[] | null
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_clip?: boolean | null
          is_edited?: boolean | null
          read_by?: string[] | null
          reactions?: Json | null
          reply_to?: Json | null
          sender_id: string
          starred_by?: string[] | null
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_clip?: boolean | null
          is_edited?: boolean | null
          read_by?: string[] | null
          reactions?: Json | null
          reply_to?: Json | null
          sender_id?: string
          starred_by?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          display_name: string
          email: string
          fcm_tokens: string[] | null
          id: string
          is_online: boolean
          last_seen: string
          links: string[] | null
          phone: string | null
          photo_url: string
          status: string
        }
        Insert: {
          display_name: string
          email: string
          fcm_tokens?: string[] | null
          id: string
          is_online?: boolean
          last_seen?: string
          links?: string[] | null
          phone?: string | null
          photo_url: string
          status: string
        }
        Update: {
          display_name?: string
          email?: string
          fcm_tokens?: string[] | null
          id?: string
          is_online?: boolean
          last_seen?: string
          links?: string[] | null
          phone?: string | null
          photo_url?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
