export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_activity: {
        Row: {
          action: string
          actor: string | null
          area: string
          created_at: string
          detail: Json
          id: string
          result: string
          subject: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          area: string
          created_at?: string
          detail?: Json
          id?: string
          result?: string
          subject?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          area?: string
          created_at?: string
          detail?: Json
          id?: string
          result?: string
          subject?: string | null
        }
        Relationships: []
      }
      ai_cache: {
        Row: {
          bucket: string | null
          cache_key: string
          created_at: string
          hits: number
          kind: string
          last_used_at: string
          model: string | null
          norm: string | null
          value: Json
        }
        Insert: {
          bucket?: string | null
          cache_key: string
          created_at?: string
          hits?: number
          kind: string
          last_used_at?: string
          model?: string | null
          norm?: string | null
          value: Json
        }
        Update: {
          bucket?: string | null
          cache_key?: string
          created_at?: string
          hits?: number
          kind?: string
          last_used_at?: string
          model?: string | null
          norm?: string | null
          value?: Json
        }
        Relationships: []
      }
      ai_events: {
        Row: {
          completion_tokens: number
          created_at: string
          duration_ms: number
          escalated: boolean
          est_cost: number
          feature: string
          id: string
          model: string | null
          outcome: string
          priority: string | null
          prompt_tokens: number
          risk: string | null
          saved_cost: number
          self_checked: boolean
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          duration_ms?: number
          escalated?: boolean
          est_cost?: number
          feature: string
          id?: string
          model?: string | null
          outcome: string
          priority?: string | null
          prompt_tokens?: number
          risk?: string | null
          saved_cost?: number
          self_checked?: boolean
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          duration_ms?: number
          escalated?: boolean
          est_cost?: number
          feature?: string
          id?: string
          model?: string | null
          outcome?: string
          priority?: string | null
          prompt_tokens?: number
          risk?: string | null
          saved_cost?: number
          self_checked?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          count: number
          day: string
          kind: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          day: string
          kind: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          kind?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beta_access: {
        Row: {
          created_at: string
          email: string
          note: string | null
        }
        Insert: {
          created_at?: string
          email: string
          note?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          note?: string | null
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          body: string
          created_at: string
          display_name: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          display_name: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          display_name?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          created_at: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          body: string
          created_at: string
          display_name: string
          hidden: boolean
          id: string
          image_url: string | null
          room: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          display_name: string
          hidden?: boolean
          id?: string
          image_url?: string | null
          room?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          display_name?: string
          hidden?: boolean
          id?: string
          image_url?: string | null
          room?: string
          user_id?: string
        }
        Relationships: []
      }
      community_reports: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reason: string | null
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reason?: string | null
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reason?: string | null
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      community_saves: {
        Row: {
          created_at: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_saves_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      content_audit_runs: {
        Row: {
          blocking: number
          created_at: string
          duration_ms: number | null
          findings: Json
          id: string
          pack: string
          started_at: string
          warnings: number
        }
        Insert: {
          blocking?: number
          created_at?: string
          duration_ms?: number | null
          findings?: Json
          id?: string
          pack: string
          started_at?: string
          warnings?: number
        }
        Update: {
          blocking?: number
          created_at?: string
          duration_ms?: number | null
          findings?: Json
          id?: string
          pack?: string
          started_at?: string
          warnings?: number
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string | null
          note: string | null
          reason: string
          ref_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          label?: string | null
          note?: string | null
          reason: string
          ref_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          note?: string | null
          reason?: string
          ref_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      content_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content_hash: string
          domain: string
          id: string
          imported_at: string
          kind: string
          note: string | null
          payload: Json
          published_at: string | null
          rolled_back_at: string | null
          source_file: string
          status: string
          superseded_at: string | null
          topic_id: string
          updated_at: string
          validated_at: string | null
          validation: Json
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content_hash: string
          domain: string
          id?: string
          imported_at?: string
          kind: string
          note?: string | null
          payload?: Json
          published_at?: string | null
          rolled_back_at?: string | null
          source_file?: string
          status?: string
          superseded_at?: string | null
          topic_id: string
          updated_at?: string
          validated_at?: string | null
          validation?: Json
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content_hash?: string
          domain?: string
          id?: string
          imported_at?: string
          kind?: string
          note?: string | null
          payload?: Json
          published_at?: string | null
          rolled_back_at?: string | null
          source_file?: string
          status?: string
          superseded_at?: string | null
          topic_id?: string
          updated_at?: string
          validated_at?: string | null
          validation?: Json
        }
        Relationships: []
      }
      course_maintenance: {
        Row: {
          domain: string
          enabled: boolean
          updated_at: string
        }
        Insert: {
          domain: string
          enabled?: boolean
          updated_at?: string
        }
        Update: {
          domain?: string
          enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          body: string
          created_at: string
          friendship_id: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          friendship_id: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          friendship_id?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_friendship_id_fkey"
            columns: ["friendship_id"]
            isOneToOne: false
            referencedRelation: "friendships"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_events: {
        Row: {
          count: number
          day: string
          flow: string
          outcome: string
          slow_count: number
          total_ms: number
          updated_at: string
        }
        Insert: {
          count?: number
          day: string
          flow: string
          outcome: string
          slow_count?: number
          total_ms?: number
          updated_at?: string
        }
        Update: {
          count?: number
          day?: string
          flow?: string
          outcome?: string
          slow_count?: number
          total_ms?: number
          updated_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      health_runs: {
        Row: {
          area: string
          checks: Json
          duration_ms: number
          finished_at: string
          id: string
          scope: string
          started_at: string
          state: string
          summary: Json
        }
        Insert: {
          area: string
          checks?: Json
          duration_ms?: number
          finished_at?: string
          id?: string
          scope?: string
          started_at?: string
          state?: string
          summary?: Json
        }
        Update: {
          area?: string
          checks?: Json
          duration_ms?: number
          finished_at?: string
          id?: string
          scope?: string
          started_at?: string
          state?: string
          summary?: Json
        }
        Relationships: []
      }
      job_locks: {
        Row: {
          job: string
          locked_until: string
          note: string | null
          updated_at: string
        }
        Insert: {
          job: string
          locked_until: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          job?: string
          locked_until?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_items: {
        Row: {
          cert_ids: Json
          concepts: Json
          content: string | null
          contradictions: Json
          created_at: string
          file_path: string | null
          file_type: string | null
          gaps: Json
          id: string
          key_terms: Json
          kind: string
          notes: string | null
          source_url: string | null
          status: string
          summary: string | null
          title: string
          topic_ids: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          cert_ids?: Json
          concepts?: Json
          content?: string | null
          contradictions?: Json
          created_at?: string
          file_path?: string | null
          file_type?: string | null
          gaps?: Json
          id?: string
          key_terms?: Json
          kind?: string
          notes?: string | null
          source_url?: string | null
          status?: string
          summary?: string | null
          title: string
          topic_ids?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          cert_ids?: Json
          concepts?: Json
          content?: string | null
          contradictions?: Json
          created_at?: string
          file_path?: string | null
          file_type?: string | null
          gaps?: Json
          id?: string
          key_terms?: Json
          kind?: string
          notes?: string | null
          source_url?: string | null
          status?: string
          summary?: string | null
          title?: string
          topic_ids?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_paths: {
        Row: {
          created_at: string
          folder: string
          name: string
          slug: string
          topics: Json
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          folder: string
          name: string
          slug: string
          topics?: Json
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          folder?: string
          name?: string
          slug?: string
          topics?: Json
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      link_checks: {
        Row: {
          checked_at: string | null
          fail_count: number
          kind: string
          label: string | null
          last_error: string | null
          ok: boolean
          status: number | null
          url: string
        }
        Insert: {
          checked_at?: string | null
          fail_count?: number
          kind: string
          label?: string | null
          last_error?: string | null
          ok?: boolean
          status?: number | null
          url: string
        }
        Update: {
          checked_at?: string | null
          fail_count?: number
          kind?: string
          label?: string | null
          last_error?: string | null
          ok?: boolean
          status?: number | null
          url?: string
        }
        Relationships: []
      }
      owner_lessons: {
        Row: {
          content_hash: string | null
          domain: string
          extras: Json
          id: string
          lesson: Json
          practice: Json
          reject_reasons: Json
          source_file: string
          sources: Json
          status: string
          synced_at: string
          topic_id: string
          version_id: string | null
        }
        Insert: {
          content_hash?: string | null
          domain: string
          extras?: Json
          id?: string
          lesson: Json
          practice?: Json
          reject_reasons?: Json
          source_file?: string
          sources?: Json
          status?: string
          synced_at?: string
          topic_id: string
          version_id?: string | null
        }
        Update: {
          content_hash?: string | null
          domain?: string
          extras?: Json
          id?: string
          lesson?: Json
          practice?: Json
          reject_reasons?: Json
          source_file?: string
          sources?: Json
          status?: string
          synced_at?: string
          topic_id?: string
          version_id?: string | null
        }
        Relationships: []
      }
      owner_questions: {
        Row: {
          content_hash: string | null
          domain: string
          id: string
          question: Json
          reject_reasons: Json
          row_number: number
          source_file: string
          status: string
          synced_at: string
          topic_id: string
          version_id: string | null
        }
        Insert: {
          content_hash?: string | null
          domain: string
          id?: string
          question: Json
          reject_reasons?: Json
          row_number?: number
          source_file?: string
          status?: string
          synced_at?: string
          topic_id: string
          version_id?: string | null
        }
        Update: {
          content_hash?: string | null
          domain?: string
          id?: string
          question?: Json
          reject_reasons?: Json
          row_number?: number
          source_file?: string
          status?: string
          synced_at?: string
          topic_id?: string
          version_id?: string | null
        }
        Relationships: []
      }
      owner_topic_work: {
        Row: {
          content_hash: string | null
          domain: string
          id: string
          notes: Json
          source_file: string
          status: string
          synced_at: string
          topic_id: string
          version_id: string | null
          work: Json
        }
        Insert: {
          content_hash?: string | null
          domain: string
          id?: string
          notes?: Json
          source_file?: string
          status?: string
          synced_at?: string
          topic_id: string
          version_id?: string | null
          work?: Json
        }
        Update: {
          content_hash?: string | null
          domain?: string
          id?: string
          notes?: Json
          source_file?: string
          status?: string
          synced_at?: string
          topic_id?: string
          version_id?: string | null
          work?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          first_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sheet_file_state: {
        Row: {
          domain: string
          file_id: string
          file_name: string
          folder: string
          last_modified: string
          synced_at: string
        }
        Insert: {
          domain: string
          file_id: string
          file_name: string
          folder: string
          last_modified: string
          synced_at?: string
        }
        Update: {
          domain?: string
          file_id?: string
          file_name?: string
          folder?: string
          last_modified?: string
          synced_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          force: boolean
          id: string
          requested_by: string | null
          result: Json | null
          scope: string
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          force?: boolean
          id?: string
          requested_by?: string | null
          result?: Json | null
          scope?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          force?: boolean
          id?: string
          requested_by?: string | null
          result?: Json | null
          scope?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      tutor_threads: {
        Row: {
          created_at: string
          id: string
          messages: Json
          mode: string | null
          title: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          mode?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          mode?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_state: {
        Row: {
          created_at: string
          data: Json
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          data?: Json
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          data?: Json
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_ai_usage: {
        Args: { _kind: string; _limit: number; _user_id: string }
        Returns: {
          allowed: boolean
          used: number
        }[]
      }
      bump_flow_event: {
        Args: {
          _duration_ms?: number
          _flow: string
          _outcome: string
          _slow?: boolean
        }
        Returns: undefined
      }
      ensure_sync_worker: { Args: never; Returns: undefined }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      stop_sync_worker: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
