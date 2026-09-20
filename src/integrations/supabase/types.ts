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
      community_messages: {
        Row: {
          body: string
          created_at: string
          display_name: string
          hidden: boolean
          id: string
          room: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          display_name: string
          hidden?: boolean
          id?: string
          room?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          display_name?: string
          hidden?: boolean
          id?: string
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
          domain: string
          id: string
          lesson: Json
          practice: Json
          reject_reasons: Json
          source_file: string
          sources: Json
          status: string
          synced_at: string
          topic_id: string
        }
        Insert: {
          domain: string
          id?: string
          lesson: Json
          practice?: Json
          reject_reasons?: Json
          source_file?: string
          sources?: Json
          status?: string
          synced_at?: string
          topic_id: string
        }
        Update: {
          domain?: string
          id?: string
          lesson?: Json
          practice?: Json
          reject_reasons?: Json
          source_file?: string
          sources?: Json
          status?: string
          synced_at?: string
          topic_id?: string
        }
        Relationships: []
      }
      owner_questions: {
        Row: {
          domain: string
          id: string
          question: Json
          reject_reasons: Json
          row_number: number
          source_file: string
          status: string
          synced_at: string
          topic_id: string
        }
        Insert: {
          domain: string
          id?: string
          question: Json
          reject_reasons?: Json
          row_number?: number
          source_file?: string
          status?: string
          synced_at?: string
          topic_id: string
        }
        Update: {
          domain?: string
          id?: string
          question?: Json
          reject_reasons?: Json
          row_number?: number
          source_file?: string
          status?: string
          synced_at?: string
          topic_id?: string
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
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
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
