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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activation_logs: {
        Row: {
          admin_email: string | null
          created_at: string
          id: string
          new_plan: string | null
          new_status: string | null
          notes: string | null
          old_plan: string | null
          old_status: string | null
          org_name: string | null
          organization_id: string
          source: string
        }
        Insert: {
          admin_email?: string | null
          created_at?: string
          id?: string
          new_plan?: string | null
          new_status?: string | null
          notes?: string | null
          old_plan?: string | null
          old_status?: string | null
          org_name?: string | null
          organization_id: string
          source?: string
        }
        Update: {
          admin_email?: string | null
          created_at?: string
          id?: string
          new_plan?: string | null
          new_status?: string | null
          notes?: string | null
          old_plan?: string | null
          old_status?: string | null
          org_name?: string | null
          organization_id?: string
          source?: string
        }
        Relationships: []
      }
      admin_telegram_dedupe: {
        Row: {
          event_key: string
          sent_at: string
        }
        Insert: {
          event_key: string
          sent_at?: string
        }
        Update: {
          event_key?: string
          sent_at?: string
        }
        Relationships: []
      }
      admin_telegram_log: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: string
          message: string
          payload: Json | null
          recipient_name: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          message: string
          payload?: Json | null
          recipient_name?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          message?: string
          payload?: Json | null
          recipient_name?: string | null
          status?: string
        }
        Relationships: []
      }
      admin_telegram_recipients: {
        Row: {
          active: boolean
          chat_id: string
          created_at: string
          events: Json
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          chat_id: string
          created_at?: string
          events?: Json
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          chat_id?: string
          created_at?: string
          events?: Json
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_client_goals: {
        Row: {
          affiliate_id: string
          choice_deadline_at: string
          client_amount_cents: number
          client_org_id: string
          client_paid_at: string
          completed_at: string | null
          created_at: string
          cycle: string
          id: string
          installments_paid: number
          installments_total: number
          mode: Database["public"]["Enums"]["affiliate_goal_mode"]
          next_release_at: string | null
          plan_key: string
          source_payment_id: string | null
          status: Database["public"]["Enums"]["affiliate_goal_status"]
          telegram_message_id: string | null
          tier_installment_pct: number
          tier_upfront_pct: number
          total_commission_cents: number
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          choice_deadline_at?: string
          client_amount_cents: number
          client_org_id: string
          client_paid_at?: string
          completed_at?: string | null
          created_at?: string
          cycle: string
          id?: string
          installments_paid?: number
          installments_total?: number
          mode?: Database["public"]["Enums"]["affiliate_goal_mode"]
          next_release_at?: string | null
          plan_key: string
          source_payment_id?: string | null
          status?: Database["public"]["Enums"]["affiliate_goal_status"]
          telegram_message_id?: string | null
          tier_installment_pct: number
          tier_upfront_pct: number
          total_commission_cents?: number
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          choice_deadline_at?: string
          client_amount_cents?: number
          client_org_id?: string
          client_paid_at?: string
          completed_at?: string | null
          created_at?: string
          cycle?: string
          id?: string
          installments_paid?: number
          installments_total?: number
          mode?: Database["public"]["Enums"]["affiliate_goal_mode"]
          next_release_at?: string | null
          plan_key?: string
          source_payment_id?: string | null
          status?: Database["public"]["Enums"]["affiliate_goal_status"]
          telegram_message_id?: string | null
          tier_installment_pct?: number
          tier_upfront_pct?: number
          total_commission_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_client_goals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_client_goals_client_org_id_fkey"
            columns: ["client_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_client_goals_client_org_id_fkey"
            columns: ["client_org_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commission_tiers: {
        Row: {
          active: boolean
          created_at: string
          cycle: string
          id: string
          installment_pct: number
          label: string
          plan_key: string
          sort_order: number
          updated_at: string
          upfront_pct: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          cycle: string
          id?: string
          installment_pct: number
          label: string
          plan_key: string
          sort_order?: number
          updated_at?: string
          upfront_pct: number
        }
        Update: {
          active?: boolean
          created_at?: string
          cycle?: string
          id?: string
          installment_pct?: number
          label?: string
          plan_key?: string
          sort_order?: number
          updated_at?: string
          upfront_pct?: number
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount_paid_cents: number
          billing_cycle: string | null
          commission_cents: number
          commission_pct: number
          created_at: string
          goal_id: string | null
          id: string
          installment_index: number
          notes: string | null
          organization_id: string
          paid_at: string | null
          paid_in_batch_id: string | null
          payment_id: string | null
          refunded_at: string | null
          release_at: string
          released_at: string | null
          status: string
        }
        Insert: {
          affiliate_id: string
          amount_paid_cents: number
          billing_cycle?: string | null
          commission_cents: number
          commission_pct: number
          created_at?: string
          goal_id?: string | null
          id?: string
          installment_index?: number
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          paid_in_batch_id?: string | null
          payment_id?: string | null
          refunded_at?: string | null
          release_at?: string
          released_at?: string | null
          status?: string
        }
        Update: {
          affiliate_id?: string
          amount_paid_cents?: number
          billing_cycle?: string | null
          commission_cents?: number
          commission_pct?: number
          created_at?: string
          goal_id?: string | null
          id?: string
          installment_index?: number
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          paid_in_batch_id?: string | null
          payment_id?: string | null
          refunded_at?: string | null
          release_at?: string
          released_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "affiliate_client_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payout_batches: {
        Row: {
          affiliate_count: number
          commission_count: number
          created_at: string
          csv_data: string | null
          id: string
          notes: string | null
          paid_at: string | null
          period_month: string
          status: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          affiliate_count?: number
          commission_count?: number
          created_at?: string
          csv_data?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_month: string
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Update: {
          affiliate_count?: number
          commission_count?: number
          created_at?: string
          csv_data?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_month?: string
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          active: boolean
          code: string
          commission_pct: number
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          pix_key: string | null
          telegram_chat_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          commission_pct?: number
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          commission_pct?: number
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_bot_config: {
        Row: {
          enabled: boolean
          greeting_message: string
          id: string
          model: string
          organization_id: string | null
          system_prompt: string
          test_instance_name: string | null
          test_instance_token: string | null
          test_org_id: string | null
          test_phone: string | null
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          greeting_message?: string
          id?: string
          model?: string
          organization_id?: string | null
          system_prompt?: string
          test_instance_name?: string | null
          test_instance_token?: string | null
          test_org_id?: string | null
          test_phone?: string | null
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          greeting_message?: string
          id?: string
          model?: string
          organization_id?: string | null
          system_prompt?: string
          test_instance_name?: string | null
          test_instance_token?: string | null
          test_org_id?: string | null
          test_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_bot_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_bot_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_bot_config_test_org_id_fkey"
            columns: ["test_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_bot_config_test_org_id_fkey"
            columns: ["test_org_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_bot_metrics: {
        Row: {
          created_at: string
          id: string
          latency_ms: number | null
          organization_id: string | null
          phone_hash: string | null
          provider: string | null
          reply_preview: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          latency_ms?: number | null
          organization_id?: string | null
          phone_hash?: string | null
          provider?: string | null
          reply_preview?: string | null
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          latency_ms?: number | null
          organization_id?: string | null
          phone_hash?: string | null
          provider?: string | null
          reply_preview?: string | null
          status?: string
        }
        Relationships: []
      }
      campaign_credits: {
        Row: {
          created_at: string
          credits_total: number
          credits_used: number
          id: string
          mp_subscription_id: string | null
          organization_id: string
          period_end: string
          period_start: string
          plan_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_total?: number
          credits_used?: number
          id?: string
          mp_subscription_id?: string | null
          organization_id: string
          period_end?: string
          period_start?: string
          plan_id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_total?: number
          credits_used?: number
          id?: string
          mp_subscription_id?: string | null
          organization_id?: string
          period_end?: string
          period_start?: string
          plan_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_credits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_credits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          error: string | null
          id: string
          organization_id: string
          outbox_id: string | null
          phone: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          error?: string | null
          id?: string
          organization_id: string
          outbox_id?: string | null
          phone: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          error?: string | null
          id?: string
          organization_id?: string
          outbox_id?: string | null
          phone?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_outbox"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          completed_at: string | null
          coupon_id: string | null
          created_at: string
          id: string
          message_template: string
          name: string
          organization_id: string
          sent_count: number
          status: string
          target_filter: Json
          total_recipients: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          coupon_id?: string | null
          created_at?: string
          id?: string
          message_template: string
          name: string
          organization_id: string
          sent_count?: number
          status?: string
          target_filter?: Json
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          coupon_id?: string | null
          created_at?: string
          id?: string
          message_template?: string
          name?: string
          organization_id?: string
          sent_count?: number
          status?: string
          target_filter?: Json
          total_recipients?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_balance: number | null
          created_at: string
          divergence_reason: string | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          opening_balance: number
          organization_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_balance?: number | null
          created_at?: string
          divergence_reason?: string | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_balance?: number
          organization_id: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_balance?: number | null
          created_at?: string
          divergence_reason?: string | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_balance?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_withdrawals: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          id: string
          movement_type: string
          organization_id: string
          reason: string | null
          session_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          id?: string
          movement_type?: string
          organization_id: string
          reason?: string | null
          session_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          id?: string
          movement_type?: string
          organization_id?: string
          reason?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_withdrawals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_withdrawals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_withdrawals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_config: {
        Row: {
          dry_run: boolean
          dry_run_until: string
          enabled: boolean
          id: number
          updated_at: string
        }
        Insert: {
          dry_run?: boolean
          dry_run_until?: string
          enabled?: boolean
          id?: number
          updated_at?: string
        }
        Update: {
          dry_run?: boolean
          dry_run_until?: string
          enabled?: boolean
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      cleanup_logs: {
        Row: {
          bucket: string | null
          created_at: string
          dry_run: boolean
          id: string
          kind: string
          metadata: Json | null
          reason: string | null
          size_bytes: number | null
          target: string
        }
        Insert: {
          bucket?: string | null
          created_at?: string
          dry_run?: boolean
          id?: string
          kind: string
          metadata?: Json | null
          reason?: string | null
          size_bytes?: number | null
          target: string
        }
        Update: {
          bucket?: string | null
          created_at?: string
          dry_run?: boolean
          id?: string
          kind?: string
          metadata?: Json | null
          reason?: string | null
          size_bytes?: number | null
          target?: string
        }
        Relationships: []
      }
      client_error_logs: {
        Row: {
          code: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          source: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          source?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          source?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          expires_at: string | null
          id: string
          max_uses: number | null
          min_order: number
          organization_id: string
          type: string
          uses: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          organization_id: string
          type: string
          uses?: number
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          organization_id?: string
          type?: string
          uses?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_shifts: {
        Row: {
          courier_id: string
          created_at: string
          ended_at: string | null
          id: string
          organization_id: string
          started_at: string
        }
        Insert: {
          courier_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          organization_id: string
          started_at?: string
        }
        Update: {
          courier_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          organization_id?: string
          started_at?: string
        }
        Relationships: []
      }
      couriers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          organization_id: string
          phone: string
          pix_key: string | null
          plate: string
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          organization_id: string
          phone: string
          pix_key?: string | null
          plate: string
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          phone?: string
          pix_key?: string | null
          plate?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "couriers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couriers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_health: {
        Row: {
          job_name: string
          last_run_count: number | null
          last_success_at: string
          notes: string | null
        }
        Insert: {
          job_name: string
          last_run_count?: number | null
          last_success_at?: string
          notes?: string | null
        }
        Update: {
          job_name?: string
          last_run_count?: number | null
          last_success_at?: string
          notes?: string | null
        }
        Relationships: []
      }
      customer_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          order_id: string
          p256dh: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          order_id: string
          p256dh: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          order_id?: string
          p256dh?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_push_subscriptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          accepted_at: string | null
          courier_id: string | null
          courier_paid: boolean
          created_at: string
          customer_address: string
          delivered_at: string | null
          distance_km: number | null
          fee: number | null
          id: string
          order_id: string
          organization_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          courier_id?: string | null
          courier_paid?: boolean
          created_at?: string
          customer_address: string
          delivered_at?: string | null
          distance_km?: number | null
          fee?: number | null
          id?: string
          order_id: string
          organization_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          courier_id?: string | null
          courier_paid?: boolean
          created_at?: string
          customer_address?: string
          delivered_at?: string | null
          distance_km?: number | null
          fee?: number | null
          id?: string
          order_id?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_neighborhoods: {
        Row: {
          active: boolean
          created_at: string
          fee: number
          id: string
          name: string
          organization_id: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          fee?: number
          id?: string
          name: string
          organization_id: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          fee?: number
          id?: string
          name?: string
          organization_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_neighborhoods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_neighborhoods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          org_id: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          platform?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_tokens_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      fcm_tokens: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fcm_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fcm_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      fila_impressao: {
        Row: {
          claimed_at: string | null
          conteudo_txt: string
          created_at: string
          id: string
          order_id: string | null
          organization_id: string
          printed_at: string | null
          status: string
        }
        Insert: {
          claimed_at?: string | null
          conteudo_txt: string
          created_at?: string
          id?: string
          order_id?: string | null
          organization_id: string
          printed_at?: string | null
          status?: string
        }
        Update: {
          claimed_at?: string | null
          conteudo_txt?: string
          created_at?: string
          id?: string
          order_id?: string | null
          organization_id?: string
          printed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fila_impressao_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_impressao_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_impressao_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      fila_whatsapp: {
        Row: {
          ai_response: string | null
          created_at: string
          id: string
          incoming_message: string
          organization_id: string | null
          phone: string
          responded_at: string | null
          status: string
        }
        Insert: {
          ai_response?: string | null
          created_at?: string
          id?: string
          incoming_message: string
          organization_id?: string | null
          phone: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          ai_response?: string | null
          created_at?: string
          id?: string
          incoming_message?: string
          organization_id?: string | null
          phone?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fila_whatsapp_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_whatsapp_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_config: {
        Row: {
          certificado_expira_em: string | null
          certificado_uploaded_at: string | null
          cfop_padrao: string | null
          cnpj: string | null
          created_at: string
          csc_id: string | null
          csc_token: string | null
          default_cest: string | null
          default_cst_csosn: string | null
          default_ncm: string | null
          default_origem: number | null
          default_unidade: string | null
          enabled: boolean
          endereco_json: Json | null
          environment: string
          focus_token_mode: string
          id: string
          ie: string | null
          im: string | null
          mode: string
          nome_fantasia: string | null
          organization_id: string
          plugnotas_empresa_id: string | null
          producao_liberada: boolean
          proximo_numero: number | null
          razao_social: string | null
          regime_tributario: number | null
          serie_nfce: number | null
          updated_at: string
        }
        Insert: {
          certificado_expira_em?: string | null
          certificado_uploaded_at?: string | null
          cfop_padrao?: string | null
          cnpj?: string | null
          created_at?: string
          csc_id?: string | null
          csc_token?: string | null
          default_cest?: string | null
          default_cst_csosn?: string | null
          default_ncm?: string | null
          default_origem?: number | null
          default_unidade?: string | null
          enabled?: boolean
          endereco_json?: Json | null
          environment?: string
          focus_token_mode?: string
          id?: string
          ie?: string | null
          im?: string | null
          mode?: string
          nome_fantasia?: string | null
          organization_id: string
          plugnotas_empresa_id?: string | null
          producao_liberada?: boolean
          proximo_numero?: number | null
          razao_social?: string | null
          regime_tributario?: number | null
          serie_nfce?: number | null
          updated_at?: string
        }
        Update: {
          certificado_expira_em?: string | null
          certificado_uploaded_at?: string | null
          cfop_padrao?: string | null
          cnpj?: string | null
          created_at?: string
          csc_id?: string | null
          csc_token?: string | null
          default_cest?: string | null
          default_cst_csosn?: string | null
          default_ncm?: string | null
          default_origem?: number | null
          default_unidade?: string | null
          enabled?: boolean
          endereco_json?: Json | null
          environment?: string
          focus_token_mode?: string
          id?: string
          ie?: string | null
          im?: string | null
          mode?: string
          nome_fantasia?: string | null
          organization_id?: string
          plugnotas_empresa_id?: string | null
          producao_liberada?: boolean
          proximo_numero?: number | null
          razao_social?: string | null
          regime_tributario?: number | null
          serie_nfce?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_econf_events: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          id: string
          invoice_id: string
          organization_id: string
          payload_json: Json | null
          protocolo: string | null
          response_json: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          organization_id: string
          payload_json?: Json | null
          protocolo?: string | null
          response_json?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          organization_id?: string
          payload_json?: Json | null
          protocolo?: string | null
          response_json?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_econf_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "fiscal_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_econf_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_econf_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_inutilizations: {
        Row: {
          created_at: string
          environment: string
          id: string
          justificativa: string
          mensagem_sefaz: string | null
          numero_final: number
          numero_inicial: number
          organization_id: string
          protocolo: string | null
          response_json: Json | null
          serie: number
          status: string
          updated_at: string
          xml_url: string | null
        }
        Insert: {
          created_at?: string
          environment?: string
          id?: string
          justificativa: string
          mensagem_sefaz?: string | null
          numero_final: number
          numero_inicial: number
          organization_id: string
          protocolo?: string | null
          response_json?: Json | null
          serie: number
          status?: string
          updated_at?: string
          xml_url?: string | null
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          justificativa?: string
          mensagem_sefaz?: string | null
          numero_final?: number
          numero_inicial?: number
          organization_id?: string
          protocolo?: string | null
          response_json?: Json | null
          serie?: number
          status?: string
          updated_at?: string
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_inutilizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_inutilizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_invoices: {
        Row: {
          attempts: number
          cancel_reason: string | null
          cancelled_at: string | null
          chave_acesso: string | null
          created_at: string
          danfe_url: string | null
          emails_sent: Json
          emitted_at: string | null
          environment: string
          id: string
          numero: number | null
          order_id: string
          organization_id: string
          payload_json: Json | null
          plugnotas_id: string | null
          protocolo: string | null
          qrcode_url: string | null
          rejection_reason: string | null
          serie: number | null
          status: string
          updated_at: string
          xml_url: string | null
        }
        Insert: {
          attempts?: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          chave_acesso?: string | null
          created_at?: string
          danfe_url?: string | null
          emails_sent?: Json
          emitted_at?: string | null
          environment?: string
          id?: string
          numero?: number | null
          order_id: string
          organization_id: string
          payload_json?: Json | null
          plugnotas_id?: string | null
          protocolo?: string | null
          qrcode_url?: string | null
          rejection_reason?: string | null
          serie?: number | null
          status?: string
          updated_at?: string
          xml_url?: string | null
        }
        Update: {
          attempts?: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          chave_acesso?: string | null
          created_at?: string
          danfe_url?: string | null
          emails_sent?: Json
          emitted_at?: string | null
          environment?: string
          id?: string
          numero?: number | null
          order_id?: string
          organization_id?: string
          payload_json?: Json | null
          plugnotas_id?: string | null
          protocolo?: string | null
          qrcode_url?: string | null
          rejection_reason?: string | null
          serie?: number | null
          status?: string
          updated_at?: string
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_usage_log: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          month_start: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          month_start: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          month_start?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_usage_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: true
            referencedRelation: "fiscal_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_usage_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_usage_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      global_addon_exclusions: {
        Row: {
          created_at: string | null
          global_addon_id: string
          id: string
          menu_item_id: string
        }
        Insert: {
          created_at?: string | null
          global_addon_id: string
          id?: string
          menu_item_id: string
        }
        Update: {
          created_at?: string | null
          global_addon_id?: string
          id?: string
          menu_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_addon_exclusions_global_addon_id_fkey"
            columns: ["global_addon_id"]
            isOneToOne: false
            referencedRelation: "global_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_addon_exclusions_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      global_addons: {
        Row: {
          available: boolean
          created_at: string
          id: string
          ifood_group_id: string | null
          ifood_option_id: string | null
          name: string
          organization_id: string
          price_cents: number
          single_choice: boolean | null
          sort_order: number
        }
        Insert: {
          available?: boolean
          created_at?: string
          id?: string
          ifood_group_id?: string | null
          ifood_option_id?: string | null
          name: string
          organization_id: string
          price_cents?: number
          single_choice?: boolean | null
          sort_order?: number
        }
        Update: {
          available?: boolean
          created_at?: string
          id?: string
          ifood_group_id?: string | null
          ifood_option_id?: string | null
          name?: string
          organization_id?: string
          price_cents?: number
          single_choice?: boolean | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "global_addons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_addons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_screenshots: {
        Row: {
          id: string
          image_url: string
          section_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          image_url: string
          section_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          image_url?: string
          section_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ifood_category_map: {
        Row: {
          category_name: string
          created_at: string
          id: string
          ifood_id: string
          organization_id: string
        }
        Insert: {
          category_name: string
          created_at?: string
          id?: string
          ifood_id: string
          organization_id: string
        }
        Update: {
          category_name?: string
          created_at?: string
          id?: string
          ifood_id?: string
          organization_id?: string
        }
        Relationships: []
      }
      ifood_credentials: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          last_event_at: string | null
          last_polled_at: string | null
          merchant_id: string | null
          merchant_name: string | null
          organization_id: string
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          last_event_at?: string | null
          last_polled_at?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          organization_id: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          last_event_at?: string | null
          last_polled_at?: string | null
          merchant_id?: string | null
          merchant_name?: string | null
          organization_id?: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ifood_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ifood_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      ifood_disputes: {
        Row: {
          created_at: string
          dispute_id: string
          dispute_type: string | null
          expires_at: string | null
          id: string
          ifood_order_id: string | null
          order_id: string | null
          organization_id: string
          payload: Json | null
          responded_at: string | null
          response_payload: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispute_id: string
          dispute_type?: string | null
          expires_at?: string | null
          id?: string
          ifood_order_id?: string | null
          order_id?: string | null
          organization_id: string
          payload?: Json | null
          responded_at?: string | null
          response_payload?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispute_id?: string
          dispute_type?: string | null
          expires_at?: string | null
          id?: string
          ifood_order_id?: string | null
          order_id?: string | null
          organization_id?: string
          payload?: Json | null
          responded_at?: string | null
          response_payload?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ifood_event_log: {
        Row: {
          code: string
          id: string
          ifood_display_id: string | null
          ifood_event_id: string | null
          ifood_order_id: string | null
          internal_order_id: string | null
          organization_id: string | null
          payload: Json | null
          received_at: string
          source: string
        }
        Insert: {
          code: string
          id?: string
          ifood_display_id?: string | null
          ifood_event_id?: string | null
          ifood_order_id?: string | null
          internal_order_id?: string | null
          organization_id?: string | null
          payload?: Json | null
          received_at?: string
          source?: string
        }
        Update: {
          code?: string
          id?: string
          ifood_display_id?: string | null
          ifood_event_id?: string | null
          ifood_order_id?: string | null
          internal_order_id?: string | null
          organization_id?: string | null
          payload?: Json | null
          received_at?: string
          source?: string
        }
        Relationships: []
      }
      ifood_merchant_interruptions: {
        Row: {
          created_at: string
          end_at: string
          id: string
          ifood_interruption_id: string
          ifood_merchant_id: string
          organization_id: string
          reason: string
          removed_at: string | null
          start_at: string
        }
        Insert: {
          created_at?: string
          end_at: string
          id?: string
          ifood_interruption_id: string
          ifood_merchant_id: string
          organization_id: string
          reason: string
          removed_at?: string | null
          start_at: string
        }
        Update: {
          created_at?: string
          end_at?: string
          id?: string
          ifood_interruption_id?: string
          ifood_merchant_id?: string
          organization_id?: string
          reason?: string
          removed_at?: string | null
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ifood_merchant_interruptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ifood_merchant_interruptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      improvement_tasks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          priority: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          priority?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          priority?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_config: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          organization_id: string
          points_to_redeem: number
          reward_type: string
          reward_value: number
          spend_per_point: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id: string
          points_to_redeem?: number
          reward_type?: string
          reward_value?: number
          spend_per_point?: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id?: string
          points_to_redeem?: number
          reward_type?: string
          reward_value?: number
          spend_per_point?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          phone: string
          points: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          phone: string
          points?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          phone?: string
          points?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_points_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_redemptions: {
        Row: {
          created_at: string
          discount_value: number
          id: string
          order_id: string | null
          organization_id: string
          phone: string
          points_used: number
        }
        Insert: {
          created_at?: string
          discount_value: number
          id?: string
          order_id?: string | null
          organization_id: string
          phone: string
          points_used: number
        }
        Update: {
          created_at?: string
          discount_value?: number
          id?: string
          order_id?: string | null
          organization_id?: string
          phone?: string
          points_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_addons: {
        Row: {
          available: boolean
          created_at: string
          id: string
          menu_item_id: string
          name: string
          price_cents: number
          single_choice: boolean | null
          sort_order: number
        }
        Insert: {
          available?: boolean
          created_at?: string
          id?: string
          menu_item_id: string
          name: string
          price_cents?: number
          single_choice?: boolean | null
          sort_order?: number
        }
        Update: {
          available?: boolean
          created_at?: string
          id?: string
          menu_item_id?: string
          name?: string
          price_cents?: number
          single_choice?: boolean | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_addons_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_ingredients: {
        Row: {
          id: string
          menu_item_id: string
          quantity_used: number
          stock_item_id: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          quantity_used?: number
          stock_item_id: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          quantity_used?: number
          stock_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_ingredients_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_ingredients_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          available: boolean
          available_days: Json | null
          category: string
          cest: string | null
          cfop: string | null
          codigo_ean: string | null
          created_at: string
          cst_csosn: string | null
          description: string | null
          hide_global_addons: boolean
          id: string
          ifood_id: string | null
          image_url: string | null
          name: string
          ncm: string | null
          organization_id: string
          origem: number | null
          price: number
          unidade: string | null
        }
        Insert: {
          available?: boolean
          available_days?: Json | null
          category?: string
          cest?: string | null
          cfop?: string | null
          codigo_ean?: string | null
          created_at?: string
          cst_csosn?: string | null
          description?: string | null
          hide_global_addons?: boolean
          id?: string
          ifood_id?: string | null
          image_url?: string | null
          name: string
          ncm?: string | null
          organization_id: string
          origem?: number | null
          price: number
          unidade?: string | null
        }
        Update: {
          available?: boolean
          available_days?: Json | null
          category?: string
          cest?: string | null
          cfop?: string | null
          codigo_ean?: string | null
          created_at?: string
          cst_csosn?: string | null
          description?: string | null
          hide_global_addons?: boolean
          id?: string
          ifood_id?: string | null
          image_url?: string | null
          name?: string
          ncm?: string | null
          organization_id?: string
          origem?: number | null
          price?: number
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          customer_name: string | null
          id: string
          menu_item_id: string | null
          name: string
          order_id: string
          price: number
          quantity: number
        }
        Insert: {
          customer_name?: string | null
          id?: string
          menu_item_id?: string | null
          name: string
          order_id: string
          price: number
          quantity?: number
        }
        Update: {
          customer_name?: string | null
          id?: string
          menu_item_id?: string | null
          name?: string
          order_id?: string
          price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancellation_reason: string | null
          coupon_id: string | null
          created_at: string
          customer_cpf: string | null
          customer_email: string | null
          customer_name_fiscal: string | null
          discount_value: number
          fiscal_invoice_id: string | null
          fiscal_status: string | null
          gateway_payment_id: string | null
          id: string
          ifood_cancellation_requested_at: string | null
          ifood_concluded_at: string | null
          ifood_delivery_localizer: string | null
          ifood_dispatched_at: string | null
          ifood_driver_assigned_at: string | null
          ifood_driver_name: string | null
          ifood_order_type: string | null
          ifood_patched_at: string | null
          ifood_scheduled_for: string | null
          ifood_synced_externally: boolean | null
          notes: string | null
          order_number: number | null
          organization_id: string
          paid: boolean
          payment_method: string | null
          status: string
          table_number: number
        }
        Insert: {
          cancellation_reason?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name_fiscal?: string | null
          discount_value?: number
          fiscal_invoice_id?: string | null
          fiscal_status?: string | null
          gateway_payment_id?: string | null
          id?: string
          ifood_cancellation_requested_at?: string | null
          ifood_concluded_at?: string | null
          ifood_delivery_localizer?: string | null
          ifood_dispatched_at?: string | null
          ifood_driver_assigned_at?: string | null
          ifood_driver_name?: string | null
          ifood_order_type?: string | null
          ifood_patched_at?: string | null
          ifood_scheduled_for?: string | null
          ifood_synced_externally?: boolean | null
          notes?: string | null
          order_number?: number | null
          organization_id: string
          paid?: boolean
          payment_method?: string | null
          status?: string
          table_number: number
        }
        Update: {
          cancellation_reason?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name_fiscal?: string | null
          discount_value?: number
          fiscal_invoice_id?: string | null
          fiscal_status?: string | null
          gateway_payment_id?: string | null
          id?: string
          ifood_cancellation_requested_at?: string | null
          ifood_concluded_at?: string | null
          ifood_delivery_localizer?: string | null
          ifood_dispatched_at?: string | null
          ifood_driver_assigned_at?: string | null
          ifood_driver_name?: string | null
          ifood_order_type?: string | null
          ifood_patched_at?: string | null
          ifood_scheduled_for?: string | null
          ifood_synced_externally?: boolean | null
          notes?: string | null
          order_number?: number | null
          organization_id?: string
          paid?: boolean
          payment_method?: string | null
          status?: string
          table_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_fiscal_invoice_id_fkey"
            columns: ["fiscal_invoice_id"]
            isOneToOne: false
            referencedRelation: "fiscal_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      org_addons: {
        Row: {
          addon_key: string
          billing_day: number
          created_at: string
          current_period_end: string | null
          id: string
          mp_preapproval_id: string | null
          organization_id: string
          price_monthly: number
          status: string
          updated_at: string
        }
        Insert: {
          addon_key: string
          billing_day?: number
          created_at?: string
          current_period_end?: string | null
          id?: string
          mp_preapproval_id?: string | null
          organization_id: string
          price_monthly: number
          status?: string
          updated_at?: string
        }
        Update: {
          addon_key?: string
          billing_day?: number
          created_at?: string
          current_period_end?: string | null
          id?: string
          mp_preapproval_id?: string | null
          organization_id?: string
          price_monthly?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_addons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_addons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_secrets: {
        Row: {
          created_at: string | null
          focus_nfe_token: string | null
          id: string
          organization_id: string
          pix_gateway_provider: string | null
          pix_gateway_token: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          focus_nfe_token?: string | null
          id?: string
          organization_id: string
          pix_gateway_provider?: string | null
          pix_gateway_token?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          focus_nfe_token?: string | null
          id?: string
          organization_id?: string
          pix_gateway_provider?: string | null
          pix_gateway_token?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_secrets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_secrets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          affiliate_id: string | null
          apk_url: string | null
          banner_url: string | null
          banner_urls: string[]
          billing_alert_limit: number | null
          billing_cycle: string
          business_hours: Json | null
          category_emojis: Json
          category_layout: Json
          category_order: Json | null
          cleanup_warning_at: string | null
          cnpj: string | null
          courier_config: Json | null
          created_at: string
          dashboard_tour_done: boolean
          delivery_config: Json | null
          description: string | null
          emoji: string
          exe_url: string | null
          force_open: boolean
          id: string
          ifood_courier_copy: boolean
          logo_url: string | null
          mp_subscription_id: string | null
          name: string
          nfce_overage_allowed: boolean
          onboarding_done: boolean
          paused: boolean
          paused_categories: Json | null
          payment_methods: Json
          pix_confirmation_mode: string
          pix_key: string | null
          primary_color: string
          print_mode: string
          printer_width: string
          referred_by_id: string | null
          requires_ai_bot_addon: boolean
          reviews_enabled: boolean
          scheduling_config: Json | null
          service_modes: Json
          single_choice_addons: boolean
          slug: string
          store_address: string | null
          subscription_plan: string
          subscription_status: string
          tax_regime: string | null
          telegram_chat_id: string | null
          theme_config: Json
          trial_ends_at: string | null
          used_first_month_promo: boolean
          user_id: string
          wa_auto_status: Json
          whatsapp: string | null
          whatsapp_bot_allowed: boolean
        }
        Insert: {
          affiliate_id?: string | null
          apk_url?: string | null
          banner_url?: string | null
          banner_urls?: string[]
          billing_alert_limit?: number | null
          billing_cycle?: string
          business_hours?: Json | null
          category_emojis?: Json
          category_layout?: Json
          category_order?: Json | null
          cleanup_warning_at?: string | null
          cnpj?: string | null
          courier_config?: Json | null
          created_at?: string
          dashboard_tour_done?: boolean
          delivery_config?: Json | null
          description?: string | null
          emoji?: string
          exe_url?: string | null
          force_open?: boolean
          id?: string
          ifood_courier_copy?: boolean
          logo_url?: string | null
          mp_subscription_id?: string | null
          name: string
          nfce_overage_allowed?: boolean
          onboarding_done?: boolean
          paused?: boolean
          paused_categories?: Json | null
          payment_methods?: Json
          pix_confirmation_mode?: string
          pix_key?: string | null
          primary_color?: string
          print_mode?: string
          printer_width?: string
          referred_by_id?: string | null
          requires_ai_bot_addon?: boolean
          reviews_enabled?: boolean
          scheduling_config?: Json | null
          service_modes?: Json
          single_choice_addons?: boolean
          slug: string
          store_address?: string | null
          subscription_plan?: string
          subscription_status?: string
          tax_regime?: string | null
          telegram_chat_id?: string | null
          theme_config?: Json
          trial_ends_at?: string | null
          used_first_month_promo?: boolean
          user_id: string
          wa_auto_status?: Json
          whatsapp?: string | null
          whatsapp_bot_allowed?: boolean
        }
        Update: {
          affiliate_id?: string | null
          apk_url?: string | null
          banner_url?: string | null
          banner_urls?: string[]
          billing_alert_limit?: number | null
          billing_cycle?: string
          business_hours?: Json | null
          category_emojis?: Json
          category_layout?: Json
          category_order?: Json | null
          cleanup_warning_at?: string | null
          cnpj?: string | null
          courier_config?: Json | null
          created_at?: string
          dashboard_tour_done?: boolean
          delivery_config?: Json | null
          description?: string | null
          emoji?: string
          exe_url?: string | null
          force_open?: boolean
          id?: string
          ifood_courier_copy?: boolean
          logo_url?: string | null
          mp_subscription_id?: string | null
          name?: string
          nfce_overage_allowed?: boolean
          onboarding_done?: boolean
          paused?: boolean
          paused_categories?: Json | null
          payment_methods?: Json
          pix_confirmation_mode?: string
          pix_key?: string | null
          primary_color?: string
          print_mode?: string
          printer_width?: string
          referred_by_id?: string | null
          requires_ai_bot_addon?: boolean
          reviews_enabled?: boolean
          scheduling_config?: Json | null
          service_modes?: Json
          single_choice_addons?: boolean
          slug?: string
          store_address?: string | null
          subscription_plan?: string
          subscription_status?: string
          tax_regime?: string | null
          telegram_chat_id?: string | null
          theme_config?: Json
          trial_ends_at?: string | null
          used_first_month_promo?: boolean
          user_id?: string
          wa_auto_status?: Json
          whatsapp?: string | null
          whatsapp_bot_allowed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "organizations_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_referred_by_id_fkey"
            columns: ["referred_by_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_referred_by_id_fkey"
            columns: ["referred_by_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_subscription_payments: {
        Row: {
          amount_cents: number
          billing_cycle: string
          created_at: string
          expires_at: string
          id: string
          organization_id: string
          payment_id: string
          plan: string
          promo_applied: boolean
          resolved_at: string | null
          status: string
        }
        Insert: {
          amount_cents?: number
          billing_cycle?: string
          created_at?: string
          expires_at?: string
          id?: string
          organization_id: string
          payment_id: string
          plan: string
          promo_applied?: boolean
          resolved_at?: string | null
          status?: string
        }
        Update: {
          amount_cents?: number
          billing_cycle?: string
          created_at?: string
          expires_at?: string
          id?: string
          organization_id?: string
          payment_id?: string
          plan?: string
          promo_applied?: boolean
          resolved_at?: string | null
          status?: string
        }
        Relationships: []
      }
      platform_config: {
        Row: {
          admin_telegram_chat_id: string | null
          admin_telegram_events: Json
          apk_url: string | null
          created_at: string
          default_trial_days: number
          delivery_config: Json
          exe_url: string | null
          fiscal_enabled: boolean
          groq_blocked_until: string | null
          hot_lead_min_orders: number
          id: string
          ifood_enabled: boolean
          uazapi_admin_token: string | null
          uazapi_server_url: string | null
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          admin_telegram_chat_id?: string | null
          admin_telegram_events?: Json
          apk_url?: string | null
          created_at?: string
          default_trial_days?: number
          delivery_config?: Json
          exe_url?: string | null
          fiscal_enabled?: boolean
          groq_blocked_until?: string | null
          hot_lead_min_orders?: number
          id?: string
          ifood_enabled?: boolean
          uazapi_admin_token?: string | null
          uazapi_server_url?: string | null
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          admin_telegram_chat_id?: string | null
          admin_telegram_events?: Json
          apk_url?: string | null
          created_at?: string
          default_trial_days?: number
          delivery_config?: Json
          exe_url?: string | null
          fiscal_enabled?: boolean
          groq_blocked_until?: string | null
          hot_lead_min_orders?: number
          id?: string
          ifood_enabled?: boolean
          uazapi_admin_token?: string | null
          uazapi_server_url?: string | null
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: []
      }
      platform_content: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      platform_counters: {
        Row: {
          id: number
          total_orders: number
        }
        Insert: {
          id?: number
          total_orders?: number
        }
        Update: {
          id?: number
          total_orders?: number
        }
        Relationships: []
      }
      platform_plans: {
        Row: {
          active: boolean
          annual_price_cents: number | null
          badge: string | null
          checkout_url: string | null
          created_at: string
          description: string | null
          features: Json
          highlighted: boolean
          id: string
          key: string
          name: string
          nfce_monthly_quota: number | null
          nfce_overage_price_cents: number | null
          price_cents: number
          quarterly_price_cents: number | null
          sort_order: number
          webhook_secret_name: string | null
        }
        Insert: {
          active?: boolean
          annual_price_cents?: number | null
          badge?: string | null
          checkout_url?: string | null
          created_at?: string
          description?: string | null
          features?: Json
          highlighted?: boolean
          id?: string
          key: string
          name: string
          nfce_monthly_quota?: number | null
          nfce_overage_price_cents?: number | null
          price_cents?: number
          quarterly_price_cents?: number | null
          sort_order?: number
          webhook_secret_name?: string | null
        }
        Update: {
          active?: boolean
          annual_price_cents?: number | null
          badge?: string | null
          checkout_url?: string | null
          created_at?: string
          description?: string | null
          features?: Json
          highlighted?: boolean
          id?: string
          key?: string
          name?: string
          nfce_monthly_quota?: number | null
          nfce_overage_price_cents?: number | null
          price_cents?: number
          quarterly_price_cents?: number | null
          sort_order?: number
          webhook_secret_name?: string | null
        }
        Relationships: []
      }
      platform_secrets: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          organization_id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          organization_id: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          organization_id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      reclame_aqui_ratelimit: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
          org_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
          org_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
          org_id?: string | null
        }
        Relationships: []
      }
      referral_block_logs: {
        Row: {
          created_at: string
          id: string
          raw_error: string | null
          reason: string
          referred_org_id: string | null
          referrer_org_id: string | null
          source_payment_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          raw_error?: string | null
          reason: string
          referred_org_id?: string | null
          referrer_org_id?: string | null
          source_payment_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          raw_error?: string | null
          reason?: string
          referred_org_id?: string | null
          referrer_org_id?: string | null
          source_payment_id?: string | null
        }
        Relationships: []
      }
      referral_bonuses: {
        Row: {
          applied_at: string | null
          bonus_days: number
          created_at: string
          flagged_reason: string | null
          id: string
          referred_org_id: string
          referred_org_name: string | null
          referrer_org_id: string
          released_at: string | null
          reverted_at: string | null
          source_payment_id: string | null
        }
        Insert: {
          applied_at?: string | null
          bonus_days?: number
          created_at?: string
          flagged_reason?: string | null
          id?: string
          referred_org_id: string
          referred_org_name?: string | null
          referrer_org_id: string
          released_at?: string | null
          reverted_at?: string | null
          source_payment_id?: string | null
        }
        Update: {
          applied_at?: string | null
          bonus_days?: number
          created_at?: string
          flagged_reason?: string | null
          id?: string
          referred_org_id?: string
          referred_org_name?: string | null
          referrer_org_id?: string
          released_at?: string | null
          reverted_at?: string | null
          source_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_bonuses_referred_org_id_fkey"
            columns: ["referred_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_bonuses_referred_org_id_fkey"
            columns: ["referred_org_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_bonuses_referrer_org_id_fkey"
            columns: ["referrer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_bonuses_referrer_org_id_fkey"
            columns: ["referrer_org_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_name: string | null
          id: string
          order_id: string | null
          organization_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          order_id?: string | null
          organization_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          order_id?: string | null
          organization_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_conversations: {
        Row: {
          admin_user_id: string
          client_name: string | null
          client_whatsapp: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          client_name?: string | null
          client_whatsapp?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          client_name?: string | null
          client_whatsapp?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sales_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          available_qty: number
          created_at: string
          id: string
          menu_item_name: string | null
          order_id: string | null
          order_number: number | null
          organization_id: string
          requested_qty: number
          shortage: number
          stock_item_id: string | null
          stock_item_name: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          available_qty?: number
          created_at?: string
          id?: string
          menu_item_name?: string | null
          order_id?: string | null
          order_number?: number | null
          organization_id: string
          requested_qty?: number
          shortage?: number
          stock_item_id?: string | null
          stock_item_name: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          available_qty?: number
          created_at?: string
          id?: string
          menu_item_name?: string | null
          order_id?: string | null
          order_number?: number | null
          organization_id?: string
          requested_qty?: number
          shortage?: number
          stock_item_id?: string | null
          stock_item_name?: string
        }
        Relationships: []
      }
      stock_items: {
        Row: {
          cost_per_unit: number
          created_at: string
          id: string
          min_quantity: number
          name: string
          organization_id: string
          quantity: number
          unit: string
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          min_quantity?: number
          name: string
          organization_id: string
          quantity?: number
          unit?: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          min_quantity?: number
          name?: string
          organization_id?: string
          quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      store_version_heartbeat: {
        Row: {
          created_at: string
          id: string
          is_standalone: boolean
          last_seen_at: string
          organization_id: string
          user_agent: string | null
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_standalone?: boolean
          last_seen_at?: string
          organization_id: string
          user_agent?: string | null
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          is_standalone?: boolean
          last_seen_at?: string
          organization_id?: string
          user_agent?: string | null
          version?: string
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount_cents: number
          billing_cycle: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          paid_at: string
          payment_id: string | null
          plan: string
          promo_applied: boolean
          source: string
        }
        Insert: {
          amount_cents: number
          billing_cycle?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          paid_at?: string
          payment_id?: string | null
          plan: string
          promo_applied?: boolean
          source?: string
        }
        Update: {
          amount_cents?: number
          billing_cycle?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string
          payment_id?: string | null
          plan?: string
          promo_applied?: boolean
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          status: string
          votes: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          status?: string
          votes?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          status?: string
          votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          organization_id: string
          resolved_at: string | null
          unread_for_admin: number
          unread_for_store: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          organization_id: string
          resolved_at?: string | null
          unread_for_admin?: number
          unread_for_store?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          organization_id?: string
          resolved_at?: string | null
          unread_for_admin?: number
          unread_for_store?: number
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachment_url: string | null
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender: string
          sender_user_id: string | null
        }
        Insert: {
          attachment_url?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender: string
          sender_user_id?: string | null
        }
        Update: {
          attachment_url?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          created_at: string
          id: string
          label: string | null
          number: number
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          number: number
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          number?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_audit_log: {
        Row: {
          affiliate_id: string | null
          chat_id: string
          command: string | null
          created_at: string
          id: string
          organization_id: string | null
          rate_limited: boolean
          update_type: string
        }
        Insert: {
          affiliate_id?: string | null
          chat_id: string
          command?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          rate_limited?: boolean
          update_type: string
        }
        Update: {
          affiliate_id?: string | null
          chat_id?: string
          command?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          rate_limited?: boolean
          update_type?: string
        }
        Relationships: []
      }
      telegram_automations_log: {
        Row: {
          event_type: string
          id: string
          organization_id: string
          ref_date: string
          sent_at: string
        }
        Insert: {
          event_type: string
          id?: string
          organization_id: string
          ref_date: string
          sent_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          organization_id?: string
          ref_date?: string
          sent_at?: string
        }
        Relationships: []
      }
      terms_acceptances: {
        Row: {
          accepted_at: string
          id: string
          ip_address: string | null
          organization_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          organization_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          organization_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wa_message_dedupe: {
        Row: {
          created_at: string
          instance_name: string | null
          message_id: string
        }
        Insert: {
          created_at?: string
          instance_name?: string | null
          message_id: string
        }
        Update: {
          created_at?: string
          instance_name?: string | null
          message_id?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          connected_at: string | null
          created_at: string
          daily_send_limit: number
          id: string
          instance_name: string
          instance_token: string
          organization_id: string
          phone_connected: string | null
          server_url: string | null
          status: string
          updated_at: string
          webhook_configured: boolean
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          daily_send_limit?: number
          id?: string
          instance_name: string
          instance_token: string
          organization_id: string
          phone_connected?: string | null
          server_url?: string | null
          status?: string
          updated_at?: string
          webhook_configured?: boolean
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          daily_send_limit?: number
          id?: string
          instance_name?: string
          instance_token?: string
          organization_id?: string
          phone_connected?: string | null
          server_url?: string | null
          status?: string
          updated_at?: string
          webhook_configured?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notification_log: {
        Row: {
          created_at: string
          error: string | null
          event: string
          id: string
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event: string
          id?: string
          order_id: string
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event?: string
          id?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notification_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_outbox: {
        Row: {
          attempts: number
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          message: string
          order_id: string | null
          organization_id: string
          phone: string
          sent_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_type: string
          id?: string
          last_error?: string | null
          message: string
          order_id?: string | null
          organization_id: string
          phone: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          message?: string
          order_id?: string | null
          organization_id?: string
          phone?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      fiscal_usage_current_month: {
        Row: {
          authorized_count: number | null
          month_start: string | null
          organization_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_usage_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_usage_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "top_stores_showcase"
            referencedColumns: ["id"]
          },
        ]
      }
      top_stores_showcase: {
        Row: {
          id: string | null
          logo_url: string | null
          name: string | null
          order_count_total: number | null
          paused: boolean | null
          primary_color: string | null
          slug: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accumulate_loyalty_points: {
        Args: { _order_total: number; _org_id: string; _phone: string }
        Returns: number
      }
      admin_bot_dashboard: { Args: { _period?: string }; Returns: Json }
      admin_bot_recent_messages: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          id: string
          latency_ms: number
          org_name: string
          organization_id: string
          phone_hash: string
          provider: string
          reply_preview: string
          status: string
        }[]
      }
      admin_delete_user: { Args: { _user_id: string }; Returns: Json }
      admin_list_users: { Args: never; Returns: Json }
      admin_set_ai_bot_enabled: {
        Args: { _enabled: boolean; _org_id: string }
        Returns: undefined
      }
      admin_set_whatsapp_bot_allowed: {
        Args: { _allowed: boolean; _org_id: string }
        Returns: undefined
      }
      admin_toggle_admin_role: {
        Args: { _grant: boolean; _user_id: string }
        Returns: Json
      }
      admin_unblock_groq: { Args: never; Returns: Json }
      apply_campaign_credits_purchase: {
        Args: {
          _credits?: number
          _days?: number
          _org_id: string
          _payment_id?: string
        }
        Returns: {
          created_at: string
          credits_total: number
          credits_used: number
          id: string
          mp_subscription_id: string | null
          organization_id: string
          period_end: string
          period_start: string
          plan_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "campaign_credits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calc_trial_ends_at: { Args: never; Returns: string }
      claim_print_jobs: {
        Args: { _org_id: string }
        Returns: {
          claimed_at: string | null
          conteudo_txt: string
          created_at: string
          id: string
          order_id: string | null
          organization_id: string
          printed_at: string | null
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "fila_impressao"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_admin_telegram_dedupe: { Args: never; Returns: undefined }
      cleanup_inactive_organizations: { Args: never; Returns: Json }
      cleanup_infra_logs: { Args: never; Returns: Json }
      cleanup_internal_postgres_logs: { Args: never; Returns: Json }
      count_inactive_customers: {
        Args: { _inactive_days?: number; _organization_id: string }
        Returns: number
      }
      courier_accept_delivery: {
        Args: { _courier_id: string; _delivery_id: string }
        Returns: undefined
      }
      courier_complete_delivery: {
        Args: { _courier_id: string; _delivery_id: string }
        Returns: undefined
      }
      courier_end_shift: {
        Args: { _courier_id: string; _shift_id: string }
        Returns: undefined
      }
      courier_get_active_shift: {
        Args: { _courier_id: string }
        Returns: {
          courier_id: string
          created_at: string
          ended_at: string
          id: string
          organization_id: string
          started_at: string
        }[]
      }
      courier_get_self: {
        Args: { courier_id: string }
        Returns: {
          active: boolean
          created_at: string
          id: string
          name: string
          organization_id: string
          phone: string
          pix_key: string | null
          plate: string
          whatsapp: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "couriers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      courier_get_shift_stats: {
        Args: { _courier_id: string }
        Returns: {
          total_daily_earned: number
          total_shifts: number
        }[]
      }
      courier_login_by_phone: {
        Args: { org_id?: string; phone_input: string }
        Returns: {
          active: boolean
          created_at: string
          id: string
          name: string
          organization_id: string
          phone: string
          pix_key: string | null
          plate: string
          whatsapp: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "couriers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      courier_start_shift: {
        Args: { _courier_id: string; _organization_id: string }
        Returns: {
          courier_id: string
          created_at: string
          ended_at: string
          id: string
          organization_id: string
          started_at: string
        }[]
      }
      enqueue_campaign: { Args: { _campaign_id: string }; Returns: Json }
      fiscal_check_quota: { Args: { _org_id: string }; Returns: Json }
      get_cleanup_stats: { Args: never; Returns: Json }
      get_effective_plan: { Args: { _org_id: string }; Returns: string }
      get_fiscal_public_status: {
        Args: { _org_id: string }
        Returns: {
          enabled: boolean
          producao_liberada: boolean
        }[]
      }
      get_inactive_customers: {
        Args: { _inactive_days?: number; _organization_id: string }
        Returns: {
          last_order_at: string
          phone: string
          total_spent: number
        }[]
      }
      get_internal_logs_sizes: { Args: never; Returns: Json }
      get_loyalty_points_by_phone: {
        Args: { _org_id: string; _phone: string }
        Returns: {
          points: number
          total_spent: number
        }[]
      }
      get_loyalty_public_config: {
        Args: { _org_id: string }
        Returns: {
          enabled: boolean
          points_to_redeem: number
          reward_type: string
          reward_value: number
          spend_per_point: number
        }[]
      }
      get_my_deliveries: {
        Args: { _courier_id: string }
        Returns: {
          accepted_at: string
          created_at: string
          customer_address: string
          distance_km: number
          fee: number
          id: string
          order_id: string
          status: string
        }[]
      }
      get_order_immutable_fields: {
        Args: { p_order_id: string }
        Returns: {
          organization_id: string
          table_number: number
        }[]
      }
      get_pending_deliveries: {
        Args: { _org_id: string }
        Returns: {
          created_at: string
          customer_address: string
          distance_km: number
          fee: number
          id: string
          order_id: string
          status: string
        }[]
      }
      get_platform_capacity_stats: { Args: never; Returns: Json }
      get_store_status: { Args: { _org_id: string }; Returns: Json }
      get_top_stores_showcase: {
        Args: never
        Returns: {
          id: string
          logo_url: string
          name: string
          order_count_total: number
          paused: boolean
          primary_color: string
          slug: string
        }[]
      }
      get_total_order_count: { Args: never; Returns: number }
      get_whatsapp_bot_allowed: { Args: { _org_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_uses: {
        Args: { _coupon_id: string }
        Returns: undefined
      }
      increment_vote: { Args: { suggestion_id: string }; Returns: undefined }
      notify_admin_telegram: {
        Args: { _event_type: string; _payload: Json }
        Returns: undefined
      }
      notify_ai_bot_expiring: { Args: never; Returns: number }
      redeem_loyalty_points: {
        Args: {
          _discount_value: number
          _order_id: string
          _org_id: string
          _phone: string
          _points_used: number
        }
        Returns: undefined
      }
      refresh_top_stores_showcase: { Args: never; Returns: undefined }
      release_pending_referral_bonuses: { Args: never; Returns: number }
      resolve_affiliate_code: { Args: { _code: string }; Returns: string }
      revert_referral_bonus_by_payment: {
        Args: { _payment_id: string }
        Returns: number
      }
      run_cleanup_internal_logs_manual: { Args: never; Returns: Json }
      run_cleanup_orgs_manual: { Args: never; Returns: Json }
      storage_maintenance_job: { Args: never; Returns: Json }
      support_get_or_create_conversation: {
        Args: { _org_id: string }
        Returns: {
          created_at: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          organization_id: string
          resolved_at: string | null
          unread_for_admin: number
          unread_for_store: number
        }
        SetofOptions: {
          from: "*"
          to: "support_conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      support_mark_read: {
        Args: { _as: string; _conversation_id: string }
        Returns: undefined
      }
      sweep_ai_bot_addons: { Args: never; Returns: number }
      toggle_cleanup_dry_run: { Args: { _dry_run: boolean }; Returns: Json }
      validate_coupon: {
        Args: { _code: string; _order_total?: number; _organization_id: string }
        Returns: Json
      }
      validate_coupon_by_code: {
        Args: { _cart_total: number; _code: string; _org_id: string }
        Returns: Json
      }
      validate_fiscal_ready: {
        Args: { _org_id: string }
        Returns: {
          detail: string
          item: string
          ok: boolean
        }[]
      }
      wa_enqueue_status: {
        Args: { p_event: string; p_order_id: string; p_org_id: string }
        Returns: undefined
      }
      wa_extract_name: { Args: { p_notes: string }; Returns: string }
      wa_extract_phone: { Args: { p_notes: string }; Returns: string }
      wa_extract_tipo: { Args: { p_notes: string }; Returns: string }
    }
    Enums: {
      affiliate_goal_mode: "pending_choice" | "upfront" | "installments_3x"
      affiliate_goal_status:
        | "awaiting_choice"
        | "active"
        | "completed"
        | "refunded"
        | "cancelled"
      app_role: "admin"
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
      affiliate_goal_mode: ["pending_choice", "upfront", "installments_3x"],
      affiliate_goal_status: [
        "awaiting_choice",
        "active",
        "completed",
        "refunded",
        "cancelled",
      ],
      app_role: ["admin"],
    },
  },
} as const
