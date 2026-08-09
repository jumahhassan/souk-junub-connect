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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      access_points: {
        Row: {
          ccq_pct: number | null
          client_count: number
          id: string
          last_seen_at: string | null
          mac_address: string
          model: string | null
          name: string | null
          router_id: string
          signal_dbm: number | null
          ssid: string | null
          status: string
          tx_rate_mbps: number | null
          updated_at: string
        }
        Insert: {
          ccq_pct?: number | null
          client_count?: number
          id?: string
          last_seen_at?: string | null
          mac_address: string
          model?: string | null
          name?: string | null
          router_id: string
          signal_dbm?: number | null
          ssid?: string | null
          status?: string
          tx_rate_mbps?: number | null
          updated_at?: string
        }
        Update: {
          ccq_pct?: number | null
          client_count?: number
          id?: string
          last_seen_at?: string | null
          mac_address?: string
          model?: string | null
          name?: string | null
          router_id?: string
          signal_dbm?: number | null
          ssid?: string | null
          status?: string
          tx_rate_mbps?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_points_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_commands: {
        Row: {
          agent_id: string
          claimed_at: string | null
          command: string
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          job_id: string | null
          payload: Json
          result: Json | null
          router_id: string | null
          status: string
        }
        Insert: {
          agent_id: string
          claimed_at?: string | null
          command: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_id?: string | null
          payload?: Json
          result?: Json | null
          router_id?: string | null
          status?: string
        }
        Update: {
          agent_id?: string
          claimed_at?: string | null
          command?: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_id?: string | null
          payload?: Json
          result?: Json | null
          router_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_commands_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "router_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commands_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "provisioning_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commands_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          detail: string | null
          id: string
          kind: string
          resolved_at: string | null
          router_id: string | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          kind: string
          resolved_at?: string | null
          router_id?: string | null
          severity?: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          resolved_at?: string | null
          router_id?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_clients: {
        Row: {
          access_point_id: string
          ccq_pct: number | null
          hostname: string | null
          id: string
          ip_address: string | null
          last_seen_at: string
          mac_address: string
          rx_bytes: number | null
          signal_dbm: number | null
          tx_bytes: number | null
          uptime_seconds: number | null
        }
        Insert: {
          access_point_id: string
          ccq_pct?: number | null
          hostname?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          mac_address: string
          rx_bytes?: number | null
          signal_dbm?: number | null
          tx_bytes?: number | null
          uptime_seconds?: number | null
        }
        Update: {
          access_point_id?: string
          ccq_pct?: number | null
          hostname?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          mac_address?: string
          rx_bytes?: number | null
          signal_dbm?: number | null
          tx_bytes?: number | null
          uptime_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_clients_access_point_id_fkey"
            columns: ["access_point_id"]
            isOneToOne: false
            referencedRelation: "access_points"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          job_title: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provisioning_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          error: string | null
          finished_at: string | null
          id: string
          rolled_back: boolean
          router_id: string
          script: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          rolled_back?: boolean
          router_id: string
          script?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          rolled_back?: boolean
          router_id?: string
          script?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provisioning_jobs_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      provisioning_steps: {
        Row: {
          detail: string | null
          finished_at: string | null
          id: string
          job_id: string
          label: string
          position: number
          started_at: string | null
          status: string
          step_key: string
        }
        Insert: {
          detail?: string | null
          finished_at?: string | null
          id?: string
          job_id: string
          label: string
          position?: number
          started_at?: string | null
          status?: string
          step_key: string
        }
        Update: {
          detail?: string | null
          finished_at?: string | null
          id?: string
          job_id?: string
          label?: string
          position?: number
          started_at?: string | null
          status?: string
          step_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "provisioning_steps_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "provisioning_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      router_agents: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ip_address: string | null
          last_seen_at: string | null
          name: string
          site_id: string | null
          status: string
          token_hash: string
          token_prefix: string
          updated_at: string
          version: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string | null
          name: string
          site_id?: string | null
          status?: string
          token_hash: string
          token_prefix: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string | null
          name?: string
          site_id?: string | null
          status?: string
          token_hash?: string
          token_prefix?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "router_agents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      router_backups: {
        Row: {
          content: string | null
          created_at: string
          file_name: string
          id: string
          reason: string
          router_id: string
          size_bytes: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_name: string
          id?: string
          reason?: string
          router_id: string
          size_bytes?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string
          file_name?: string
          id?: string
          reason?: string
          router_id?: string
          size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "router_backups_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      router_events: {
        Row: {
          agent_id: string | null
          created_at: string
          id: number
          kind: string
          message: string
          metadata: Json | null
          router_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: number
          kind: string
          message: string
          metadata?: Json | null
          router_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: number
          kind?: string
          message?: string
          metadata?: Json | null
          router_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "router_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "router_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "router_events_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      router_interfaces: {
        Row: {
          id: string
          mac_address: string | null
          name: string
          role: string | null
          router_id: string
          running: boolean
          rx_bps: number
          rx_bytes: number | null
          tx_bps: number
          tx_bytes: number | null
          type: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          mac_address?: string | null
          name: string
          role?: string | null
          router_id: string
          running?: boolean
          rx_bps?: number
          rx_bytes?: number | null
          tx_bps?: number
          tx_bytes?: number | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          mac_address?: string | null
          name?: string
          role?: string | null
          router_id?: string
          running?: boolean
          rx_bps?: number
          rx_bytes?: number | null
          tx_bps?: number
          tx_bytes?: number | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "router_interfaces_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      router_metrics: {
        Row: {
          active_users: number | null
          cpu_load: number | null
          id: number
          latency_ms: number | null
          memory_used_mb: number | null
          packet_loss_pct: number | null
          recorded_at: string
          router_id: string
          rx_bps: number | null
          tx_bps: number | null
        }
        Insert: {
          active_users?: number | null
          cpu_load?: number | null
          id?: number
          latency_ms?: number | null
          memory_used_mb?: number | null
          packet_loss_pct?: number | null
          recorded_at?: string
          router_id: string
          rx_bps?: number | null
          tx_bps?: number | null
        }
        Update: {
          active_users?: number | null
          cpu_load?: number | null
          id?: number
          latency_ms?: number | null
          memory_used_mb?: number | null
          packet_loss_pct?: number | null
          recorded_at?: string
          router_id?: string
          rx_bps?: number | null
          tx_bps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "router_metrics_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      routers: {
        Row: {
          active_users: number
          agent_id: string | null
          api_port: number
          api_username: string | null
          board_name: string | null
          cpu_load: number | null
          created_at: string
          heartbeat_threshold_seconds: number
          host: string
          id: string
          identity: string | null
          last_seen_at: string | null
          latency_ms: number | null
          memory_total_mb: number | null
          memory_used_mb: number | null
          name: string
          notes: string | null
          packet_loss_pct: number | null
          pcc_status: Json | null
          ros_version: string | null
          serial_number: string | null
          site_id: string | null
          status: string
          updated_at: string
          uptime_seconds: number | null
          use_ssl: boolean
        }
        Insert: {
          active_users?: number
          agent_id?: string | null
          api_port?: number
          api_username?: string | null
          board_name?: string | null
          cpu_load?: number | null
          created_at?: string
          heartbeat_threshold_seconds?: number
          host: string
          id?: string
          identity?: string | null
          last_seen_at?: string | null
          latency_ms?: number | null
          memory_total_mb?: number | null
          memory_used_mb?: number | null
          name: string
          notes?: string | null
          packet_loss_pct?: number | null
          pcc_status?: Json | null
          ros_version?: string | null
          serial_number?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
          uptime_seconds?: number | null
          use_ssl?: boolean
        }
        Update: {
          active_users?: number
          agent_id?: string | null
          api_port?: number
          api_username?: string | null
          board_name?: string | null
          cpu_load?: number | null
          created_at?: string
          heartbeat_threshold_seconds?: number
          host?: string
          id?: string
          identity?: string | null
          last_seen_at?: string | null
          latency_ms?: number | null
          memory_total_mb?: number | null
          memory_used_mb?: number | null
          name?: string
          notes?: string | null
          packet_loss_pct?: number | null
          pcc_status?: Json | null
          ros_version?: string | null
          serial_number?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
          uptime_seconds?: number | null
          use_ssl?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "routers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "router_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routers_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          region: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff_writer: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "admin" | "noc" | "agent" | "technician"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "noc", "agent", "technician"],
    },
  },
} as const
