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
      customers: {
        Row: {
          address: string | null
          area: string | null
          balance_ssp: number
          created_at: string
          created_by: string | null
          customer_type: string
          email: string | null
          full_name: string
          hotspot_user_id: string | null
          id: string
          national_id: string | null
          notes: string | null
          phone: string | null
          pppoe_subscriber_id: string | null
          router_id: string | null
          site_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          area?: string | null
          balance_ssp?: number
          created_at?: string
          created_by?: string | null
          customer_type?: string
          email?: string | null
          full_name: string
          hotspot_user_id?: string | null
          id?: string
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          pppoe_subscriber_id?: string | null
          router_id?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          area?: string | null
          balance_ssp?: number
          created_at?: string
          created_by?: string | null
          customer_type?: string
          email?: string | null
          full_name?: string
          hotspot_user_id?: string | null
          id?: string
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          pppoe_subscriber_id?: string | null
          router_id?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_hotspot_user_id_fkey"
            columns: ["hotspot_user_id"]
            isOneToOne: false
            referencedRelation: "hotspot_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_pppoe_subscriber_id_fkey"
            columns: ["pppoe_subscriber_id"]
            isOneToOne: false
            referencedRelation: "pppoe_subscribers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      hotspot_packages: {
        Row: {
          burst_download_kbps: number | null
          burst_threshold_download_kbps: number | null
          burst_threshold_upload_kbps: number | null
          burst_time_seconds: number | null
          burst_upload_kbps: number | null
          created_at: string
          created_by: string | null
          data_cap_mb: number | null
          description: string | null
          download_kbps: number
          duration_minutes: number | null
          fup_after_mb: number | null
          fup_download_kbps: number | null
          fup_enabled: boolean
          fup_upload_kbps: number | null
          id: string
          is_active: boolean
          kind: string
          name: string
          price_ssp: number
          shared_users: number
          sort_order: number
          updated_at: string
          upload_kbps: number
          validity_days: number | null
        }
        Insert: {
          burst_download_kbps?: number | null
          burst_threshold_download_kbps?: number | null
          burst_threshold_upload_kbps?: number | null
          burst_time_seconds?: number | null
          burst_upload_kbps?: number | null
          created_at?: string
          created_by?: string | null
          data_cap_mb?: number | null
          description?: string | null
          download_kbps?: number
          duration_minutes?: number | null
          fup_after_mb?: number | null
          fup_download_kbps?: number | null
          fup_enabled?: boolean
          fup_upload_kbps?: number | null
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          price_ssp?: number
          shared_users?: number
          sort_order?: number
          updated_at?: string
          upload_kbps?: number
          validity_days?: number | null
        }
        Update: {
          burst_download_kbps?: number | null
          burst_threshold_download_kbps?: number | null
          burst_threshold_upload_kbps?: number | null
          burst_time_seconds?: number | null
          burst_upload_kbps?: number | null
          created_at?: string
          created_by?: string | null
          data_cap_mb?: number | null
          description?: string | null
          download_kbps?: number
          duration_minutes?: number | null
          fup_after_mb?: number | null
          fup_download_kbps?: number | null
          fup_enabled?: boolean
          fup_upload_kbps?: number | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          price_ssp?: number
          shared_users?: number
          sort_order?: number
          updated_at?: string
          upload_kbps?: number
          validity_days?: number | null
        }
        Relationships: []
      }
      hotspot_sessions: {
        Row: {
          ended_at: string | null
          hotspot_user_id: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          mac_address: string | null
          router_id: string | null
          rx_bytes: number
          rx_rate_kbps: number
          started_at: string
          tx_bytes: number
          tx_rate_kbps: number
          username: string | null
          voucher_id: string | null
        }
        Insert: {
          ended_at?: string | null
          hotspot_user_id?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          mac_address?: string | null
          router_id?: string | null
          rx_bytes?: number
          rx_rate_kbps?: number
          started_at?: string
          tx_bytes?: number
          tx_rate_kbps?: number
          username?: string | null
          voucher_id?: string | null
        }
        Update: {
          ended_at?: string | null
          hotspot_user_id?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          mac_address?: string | null
          router_id?: string | null
          rx_bytes?: number
          rx_rate_kbps?: number
          started_at?: string
          tx_bytes?: number
          tx_rate_kbps?: number
          username?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotspot_sessions_hotspot_user_id_fkey"
            columns: ["hotspot_user_id"]
            isOneToOne: false
            referencedRelation: "hotspot_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotspot_sessions_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotspot_sessions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      hotspot_users: {
        Row: {
          activated_at: string | null
          created_at: string
          data_used_mb: number
          email: string | null
          expires_at: string | null
          full_name: string | null
          id: string
          ip_address: string | null
          is_online: boolean
          last_router_id: string | null
          last_seen_at: string | null
          mac_address: string | null
          minutes_used: number
          package_id: string | null
          password: string | null
          phone: string | null
          site_id: string | null
          source: string
          status: string
          updated_at: string
          username: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          data_used_mb?: number
          email?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          ip_address?: string | null
          is_online?: boolean
          last_router_id?: string | null
          last_seen_at?: string | null
          mac_address?: string | null
          minutes_used?: number
          package_id?: string | null
          password?: string | null
          phone?: string | null
          site_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          username: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          data_used_mb?: number
          email?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          ip_address?: string | null
          is_online?: boolean
          last_router_id?: string | null
          last_seen_at?: string | null
          mac_address?: string | null
          minutes_used?: number
          package_id?: string | null
          password?: string | null
          phone?: string | null
          site_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotspot_users_last_router_id_fkey"
            columns: ["last_router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotspot_users_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "hotspot_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotspot_users_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      message_campaigns: {
        Row: {
          audience: Json
          body: string
          channel: string
          created_at: string
          created_by: string | null
          failed_count: number
          id: string
          name: string
          scheduled_for: string | null
          sent_count: number
          status: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          audience?: Json
          body: string
          channel?: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          name: string
          scheduled_for?: string | null
          sent_count?: number
          status?: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          audience?: Json
          body?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          name?: string
          scheduled_for?: string | null
          sent_count?: number
          status?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: []
      }
      message_log: {
        Row: {
          body: string
          campaign_id: string | null
          channel: string
          created_at: string
          customer_id: string | null
          error: string | null
          id: string
          metadata: Json
          provider: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          template_key: string | null
          to_address: string
        }
        Insert: {
          body: string
          campaign_id?: string | null
          channel?: string
          created_at?: string
          customer_id?: string | null
          error?: string | null
          id?: string
          metadata?: Json
          provider?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          template_key?: string | null
          to_address: string
        }
        Update: {
          body?: string
          campaign_id?: string | null
          channel?: string
          created_at?: string
          customer_id?: string | null
          error?: string | null
          id?: string
          metadata?: Json
          provider?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          template_key?: string | null
          to_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "message_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          is_active: boolean
          key: string
          name: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          name: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messaging_providers: {
        Row: {
          base_url: string | null
          channel: string
          config: Json
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          label: string
          provider: string
          sender_id: string | null
          updated_at: string
        }
        Insert: {
          base_url?: string | null
          channel?: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label: string
          provider: string
          sender_id?: string | null
          updated_at?: string
        }
        Update: {
          base_url?: string | null
          channel?: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string
          provider?: string
          sender_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_ssp: number
          created_at: string
          failure_reason: string | null
          hotspot_user_id: string | null
          id: string
          metadata: Json
          msisdn: string | null
          package_id: string | null
          paid_at: string | null
          pppoe_invoice_id: string | null
          pppoe_subscriber_id: string | null
          provider: string
          provider_reference: string | null
          receipt_number: string | null
          recorded_by: string | null
          reference: string
          retry_count: number
          status: string
          updated_at: string
          voucher_id: string | null
        }
        Insert: {
          amount_ssp?: number
          created_at?: string
          failure_reason?: string | null
          hotspot_user_id?: string | null
          id?: string
          metadata?: Json
          msisdn?: string | null
          package_id?: string | null
          paid_at?: string | null
          pppoe_invoice_id?: string | null
          pppoe_subscriber_id?: string | null
          provider?: string
          provider_reference?: string | null
          receipt_number?: string | null
          recorded_by?: string | null
          reference: string
          retry_count?: number
          status?: string
          updated_at?: string
          voucher_id?: string | null
        }
        Update: {
          amount_ssp?: number
          created_at?: string
          failure_reason?: string | null
          hotspot_user_id?: string | null
          id?: string
          metadata?: Json
          msisdn?: string | null
          package_id?: string | null
          paid_at?: string | null
          pppoe_invoice_id?: string | null
          pppoe_subscriber_id?: string | null
          provider?: string
          provider_reference?: string | null
          receipt_number?: string | null
          recorded_by?: string | null
          reference?: string
          retry_count?: number
          status?: string
          updated_at?: string
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_hotspot_user_id_fkey"
            columns: ["hotspot_user_id"]
            isOneToOne: false
            referencedRelation: "hotspot_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "hotspot_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_pppoe_invoice_id_fkey"
            columns: ["pppoe_invoice_id"]
            isOneToOne: false
            referencedRelation: "pppoe_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_pppoe_subscriber_id_fkey"
            columns: ["pppoe_subscriber_id"]
            isOneToOne: false
            referencedRelation: "pppoe_subscribers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_ads: {
        Row: {
          asset_url: string | null
          body_text: string | null
          clicks: number
          created_at: string
          daily_end_time: string | null
          daily_start_time: string | null
          ends_at: string | null
          id: string
          impressions: number
          is_active: boolean
          kind: string
          portal_id: string | null
          starts_at: string | null
          target_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          asset_url?: string | null
          body_text?: string | null
          clicks?: number
          created_at?: string
          daily_end_time?: string | null
          daily_start_time?: string | null
          ends_at?: string | null
          id?: string
          impressions?: number
          is_active?: boolean
          kind?: string
          portal_id?: string | null
          starts_at?: string | null
          target_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          asset_url?: string | null
          body_text?: string | null
          clicks?: number
          created_at?: string
          daily_end_time?: string | null
          daily_start_time?: string | null
          ends_at?: string | null
          id?: string
          impressions?: number
          is_active?: boolean
          kind?: string
          portal_id?: string | null
          starts_at?: string | null
          target_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_ads_portal_id_fkey"
            columns: ["portal_id"]
            isOneToOne: false
            referencedRelation: "portal_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_settings: {
        Row: {
          accent_color: string
          allow_otp: boolean
          allow_userpass: boolean
          allow_voucher: boolean
          background_url: string | null
          created_at: string
          custom_css: string | null
          default_language: string
          favicon_url: string | null
          id: string
          is_active: boolean
          languages: string[]
          logo_url: string | null
          name: string
          primary_color: string
          secondary_color: string
          site_id: string | null
          terms_text: string | null
          theme: string
          trial_data_mb: number
          trial_enabled: boolean
          trial_max_per_device_per_day: number
          trial_minutes: number
          trial_mode: string
          updated_at: string
          welcome_message: string | null
          welcome_title: string
        }
        Insert: {
          accent_color?: string
          allow_otp?: boolean
          allow_userpass?: boolean
          allow_voucher?: boolean
          background_url?: string | null
          created_at?: string
          custom_css?: string | null
          default_language?: string
          favicon_url?: string | null
          id?: string
          is_active?: boolean
          languages?: string[]
          logo_url?: string | null
          name?: string
          primary_color?: string
          secondary_color?: string
          site_id?: string | null
          terms_text?: string | null
          theme?: string
          trial_data_mb?: number
          trial_enabled?: boolean
          trial_max_per_device_per_day?: number
          trial_minutes?: number
          trial_mode?: string
          updated_at?: string
          welcome_message?: string | null
          welcome_title?: string
        }
        Update: {
          accent_color?: string
          allow_otp?: boolean
          allow_userpass?: boolean
          allow_voucher?: boolean
          background_url?: string | null
          created_at?: string
          custom_css?: string | null
          default_language?: string
          favicon_url?: string | null
          id?: string
          is_active?: boolean
          languages?: string[]
          logo_url?: string | null
          name?: string
          primary_color?: string
          secondary_color?: string
          site_id?: string | null
          terms_text?: string | null
          theme?: string
          trial_data_mb?: number
          trial_enabled?: boolean
          trial_max_per_device_per_day?: number
          trial_minutes?: number
          trial_mode?: string
          updated_at?: string
          welcome_message?: string | null
          welcome_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_settings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      pppoe_invoices: {
        Row: {
          amount_ssp: number
          created_at: string
          due_at: string | null
          id: string
          invoice_number: string
          paid_at: string | null
          period_end: string
          period_start: string
          plan_id: string | null
          static_ip_fee_ssp: number
          status: string
          subscriber_id: string
          updated_at: string
        }
        Insert: {
          amount_ssp?: number
          created_at?: string
          due_at?: string | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          plan_id?: string | null
          static_ip_fee_ssp?: number
          status?: string
          subscriber_id: string
          updated_at?: string
        }
        Update: {
          amount_ssp?: number
          created_at?: string
          due_at?: string | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          plan_id?: string | null
          static_ip_fee_ssp?: number
          status?: string
          subscriber_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pppoe_invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pppoe_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pppoe_invoices_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "pppoe_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      pppoe_plans: {
        Row: {
          billing_cycle: string
          billing_type: string
          burst_download_kbps: number | null
          burst_threshold_download_kbps: number | null
          burst_threshold_upload_kbps: number | null
          burst_time_seconds: number | null
          burst_upload_kbps: number | null
          change_tcp_mss: boolean
          created_at: string
          created_by: string | null
          description: string | null
          dns_servers: string | null
          download_kbps: number
          fup_after_gb: number | null
          fup_download_kbps: number | null
          fup_enabled: boolean
          fup_upload_kbps: number | null
          id: string
          is_active: boolean
          local_address: string | null
          name: string
          only_one: boolean
          price_ssp: number
          profile_name: string
          remote_address_pool: string | null
          sort_order: number
          updated_at: string
          upload_kbps: number
          use_compression: boolean
          use_encryption: boolean
        }
        Insert: {
          billing_cycle?: string
          billing_type?: string
          burst_download_kbps?: number | null
          burst_threshold_download_kbps?: number | null
          burst_threshold_upload_kbps?: number | null
          burst_time_seconds?: number | null
          burst_upload_kbps?: number | null
          change_tcp_mss?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          dns_servers?: string | null
          download_kbps?: number
          fup_after_gb?: number | null
          fup_download_kbps?: number | null
          fup_enabled?: boolean
          fup_upload_kbps?: number | null
          id?: string
          is_active?: boolean
          local_address?: string | null
          name: string
          only_one?: boolean
          price_ssp?: number
          profile_name: string
          remote_address_pool?: string | null
          sort_order?: number
          updated_at?: string
          upload_kbps?: number
          use_compression?: boolean
          use_encryption?: boolean
        }
        Update: {
          billing_cycle?: string
          billing_type?: string
          burst_download_kbps?: number | null
          burst_threshold_download_kbps?: number | null
          burst_threshold_upload_kbps?: number | null
          burst_time_seconds?: number | null
          burst_upload_kbps?: number | null
          change_tcp_mss?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          dns_servers?: string | null
          download_kbps?: number
          fup_after_gb?: number | null
          fup_download_kbps?: number | null
          fup_enabled?: boolean
          fup_upload_kbps?: number | null
          id?: string
          is_active?: boolean
          local_address?: string | null
          name?: string
          only_one?: boolean
          price_ssp?: number
          profile_name?: string
          remote_address_pool?: string | null
          sort_order?: number
          updated_at?: string
          upload_kbps?: number
          use_compression?: boolean
          use_encryption?: boolean
        }
        Relationships: []
      }
      pppoe_sessions: {
        Row: {
          caller_id: string | null
          disconnect_reason: string | null
          ended_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          profile_name: string | null
          router_id: string | null
          rx_bytes: number
          rx_rate_kbps: number
          service: string
          started_at: string
          subscriber_id: string | null
          tx_bytes: number
          tx_rate_kbps: number
          uptime_seconds: number
          username: string
        }
        Insert: {
          caller_id?: string | null
          disconnect_reason?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          profile_name?: string | null
          router_id?: string | null
          rx_bytes?: number
          rx_rate_kbps?: number
          service?: string
          started_at?: string
          subscriber_id?: string | null
          tx_bytes?: number
          tx_rate_kbps?: number
          uptime_seconds?: number
          username: string
        }
        Update: {
          caller_id?: string | null
          disconnect_reason?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          profile_name?: string | null
          router_id?: string | null
          rx_bytes?: number
          rx_rate_kbps?: number
          service?: string
          started_at?: string
          subscriber_id?: string | null
          tx_bytes?: number
          tx_rate_kbps?: number
          uptime_seconds?: number
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "pppoe_sessions_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pppoe_sessions_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "pppoe_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      pppoe_subscribers: {
        Row: {
          activated_at: string | null
          address: string | null
          auto_renew: boolean
          balance_ssp: number
          caller_id: string | null
          comment: string | null
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string | null
          full_name: string | null
          id: string
          is_online: boolean
          last_seen_at: string | null
          local_address: string | null
          password: string
          phone: string | null
          plan_id: string | null
          remote_address: string | null
          router_id: string | null
          service: string
          site_id: string | null
          status: string
          updated_at: string
          username: string
        }
        Insert: {
          activated_at?: string | null
          address?: string | null
          auto_renew?: boolean
          balance_ssp?: number
          caller_id?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          is_online?: boolean
          last_seen_at?: string | null
          local_address?: string | null
          password: string
          phone?: string | null
          plan_id?: string | null
          remote_address?: string | null
          router_id?: string | null
          service?: string
          site_id?: string | null
          status?: string
          updated_at?: string
          username: string
        }
        Update: {
          activated_at?: string | null
          address?: string | null
          auto_renew?: boolean
          balance_ssp?: number
          caller_id?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          is_online?: boolean
          last_seen_at?: string | null
          local_address?: string | null
          password?: string
          phone?: string | null
          plan_id?: string | null
          remote_address?: string | null
          router_id?: string | null
          service?: string
          site_id?: string | null
          status?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "pppoe_subscribers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pppoe_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pppoe_subscribers_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pppoe_subscribers_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
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
      static_ip_allocations: {
        Row: {
          assigned_at: string
          created_at: string
          created_by: string | null
          id: string
          ip_address: string
          label: string | null
          mac_address: string | null
          monthly_fee_ssp: number
          notes: string | null
          released_at: string | null
          router_id: string | null
          status: string
          subscriber_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address: string
          label?: string | null
          mac_address?: string | null
          monthly_fee_ssp?: number
          notes?: string | null
          released_at?: string | null
          router_id?: string | null
          status?: string
          subscriber_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address?: string
          label?: string | null
          mac_address?: string | null
          monthly_fee_ssp?: number
          notes?: string | null
          released_at?: string | null
          router_id?: string | null
          status?: string
          subscriber_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "static_ip_allocations_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "static_ip_allocations_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "pppoe_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          closed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          first_response_at: string | null
          id: string
          priority: string
          resolved_at: string | null
          router_id: string | null
          sla_due_at: string | null
          source: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          first_response_at?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          router_id?: string | null
          sla_due_at?: string | null
          source?: string
          status?: string
          subject: string
          ticket_number?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          first_response_at?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          router_id?: string | null
          sla_due_at?: string | null
          source?: string
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          channel: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body: string
          channel?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          channel?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_grants: {
        Row: {
          device_fingerprint: string | null
          expires_at: string | null
          granted_at: string
          id: string
          mac_address: string | null
          phone: string | null
          router_id: string | null
        }
        Insert: {
          device_fingerprint?: string | null
          expires_at?: string | null
          granted_at?: string
          id?: string
          mac_address?: string | null
          phone?: string | null
          router_id?: string | null
        }
        Update: {
          device_fingerprint?: string | null
          expires_at?: string | null
          granted_at?: string
          id?: string
          mac_address?: string | null
          phone?: string | null
          router_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_grants_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
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
      voucher_batches: {
        Row: {
          code_format: string
          code_length: number
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          name: string
          notes: string | null
          package_id: string
          prefix: string | null
          quantity: number
          site_id: string | null
          updated_at: string
        }
        Insert: {
          code_format?: string
          code_length?: number
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          name: string
          notes?: string | null
          package_id: string
          prefix?: string | null
          quantity?: number
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          code_format?: string
          code_length?: number
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          package_id?: string
          prefix?: string | null
          quantity?: number
          site_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_batches_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "hotspot_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_batches_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          activated_at: string | null
          batch_id: string | null
          code: string
          created_at: string
          data_used_mb: number
          expires_at: string | null
          id: string
          ip_address: string | null
          mac_address: string | null
          minutes_used: number
          package_id: string
          phone: string | null
          price_ssp: number
          router_id: string | null
          state: string
          updated_at: string
          used_at: string | null
        }
        Insert: {
          activated_at?: string | null
          batch_id?: string | null
          code: string
          created_at?: string
          data_used_mb?: number
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          mac_address?: string | null
          minutes_used?: number
          package_id: string
          phone?: string | null
          price_ssp?: number
          router_id?: string | null
          state?: string
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          activated_at?: string | null
          batch_id?: string | null
          code?: string
          created_at?: string
          data_used_mb?: number
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          mac_address?: string | null
          minutes_used?: number
          package_id?: string
          phone?: string | null
          price_ssp?: number
          router_id?: string | null
          state?: string
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "voucher_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "hotspot_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
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
