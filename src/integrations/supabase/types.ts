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
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount_paid_cents: number
          billing_cycle: string | null
          commission_cents: number
          commission_pct: number
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          paid_at: string | null
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
          id?: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
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
          id?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
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
            foreignKeyName: "affiliate_commissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          system_prompt: string
          test_org_id: string | null
          test_phone: string | null
          uazapi_instance_name: string | null
          uazapi_server_url: string | null
          uazapi_token: string | null
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          greeting_message?: string
          id?: string
          model?: string
          system_prompt?: string
          test_org_id?: string | null
          test_phone?: string | null
          uazapi_instance_name?: string | null
          uazapi_server_url?: string | null
          uazapi_token?: string | null
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          greeting_message?: string
          id?: string
          model?: string
          system_prompt?: string
          test_org_id?: string | null
          test_phone?: string | null
          uazapi_instance_name?: string | null
          uazapi_server_url?: string | null
          uazapi_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_bot_config_test_org_id_fkey"
            columns: ["test_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          closing_balance: number | null
          created_at: string
          id: string
          notes: string | null
          opened_at: string
          opening_balance: number
          organization_id: string
        }
        Insert: {
          closed_at?: string | null
          closing_balance?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opening_balance?: number
          organization_id: string
        }
        Update: {
          closed_at?: string | null
          closing_balance?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
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
        ]
      }
      cash_withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          organization_id: string
          reason: string | null
          session_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          organization_id: string
          reason?: string | null
          session_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
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
            foreignKeyName: "cash_withdrawals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_error_logs: {
        Row: {
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
        ]
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
        ]
      }
      fila_whatsapp: {
        Row: {
          ai_response: string | null
          created_at: string
          id: string
          incoming_message: string
          phone: string
          responded_at: string | null
          status: string
        }
        Insert: {
          ai_response?: string | null
          created_at?: string
          id?: string
          incoming_message: string
          phone: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          ai_response?: string | null
          created_at?: string
          id?: string
          incoming_message?: string
          phone?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: []
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
          name: string
          organization_id: string
          price_cents: number
          sort_order: number
        }
        Insert: {
          available?: boolean
          created_at?: string
          id?: string
          name: string
          organization_id: string
          price_cents?: number
          sort_order?: number
        }
        Update: {
          available?: boolean
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          price_cents?: number
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
      ifood_credentials: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          merchant_id: string | null
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
          merchant_id?: string | null
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
          merchant_id?: string | null
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
          sort_order: number
        }
        Insert: {
          available?: boolean
          created_at?: string
          id?: string
          menu_item_id: string
          name: string
          price_cents?: number
          sort_order?: number
        }
        Update: {
          available?: boolean
          created_at?: string
          id?: string
          menu_item_id?: string
          name?: string
          price_cents?: number
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
          created_at: string
          description: string | null
          hide_global_addons: boolean
          id: string
          image_url: string | null
          name: string
          organization_id: string
          price: number
        }
        Insert: {
          available?: boolean
          available_days?: Json | null
          category?: string
          created_at?: string
          description?: string | null
          hide_global_addons?: boolean
          id?: string
          image_url?: string | null
          name: string
          organization_id: string
          price: number
        }
        Update: {
          available?: boolean
          available_days?: Json | null
          category?: string
          created_at?: string
          description?: string | null
          hide_global_addons?: boolean
          id?: string
          image_url?: string | null
          name?: string
          organization_id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          created_at: string
          gateway_payment_id: string | null
          id: string
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
          created_at?: string
          gateway_payment_id?: string | null
          id?: string
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
          created_at?: string
          gateway_payment_id?: string | null
          id?: string
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
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_secrets: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          pix_gateway_provider: string | null
          pix_gateway_token: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          pix_gateway_provider?: string | null
          pix_gateway_token?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
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
        ]
      }
      organizations: {
        Row: {
          affiliate_id: string | null
          apk_url: string | null
          banner_url: string | null
          billing_alert_limit: number | null
          billing_cycle: string
          business_hours: Json | null
          category_emojis: Json
          category_order: Json | null
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
          logo_url: string | null
          mp_subscription_id: string | null
          name: string
          onboarding_done: boolean
          paused: boolean
          paused_categories: Json | null
          pix_confirmation_mode: string
          pix_key: string | null
          primary_color: string
          print_mode: string
          printer_width: string
          referred_by_id: string | null
          scheduling_config: Json | null
          service_modes: Json
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
        }
        Insert: {
          affiliate_id?: string | null
          apk_url?: string | null
          banner_url?: string | null
          billing_alert_limit?: number | null
          billing_cycle?: string
          business_hours?: Json | null
          category_emojis?: Json
          category_order?: Json | null
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
          logo_url?: string | null
          mp_subscription_id?: string | null
          name: string
          onboarding_done?: boolean
          paused?: boolean
          paused_categories?: Json | null
          pix_confirmation_mode?: string
          pix_key?: string | null
          primary_color?: string
          print_mode?: string
          printer_width?: string
          referred_by_id?: string | null
          scheduling_config?: Json | null
          service_modes?: Json
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
        }
        Update: {
          affiliate_id?: string | null
          apk_url?: string | null
          banner_url?: string | null
          billing_alert_limit?: number | null
          billing_cycle?: string
          business_hours?: Json | null
          category_emojis?: Json
          category_order?: Json | null
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
          logo_url?: string | null
          mp_subscription_id?: string | null
          name?: string
          onboarding_done?: boolean
          paused?: boolean
          paused_categories?: Json | null
          pix_confirmation_mode?: string
          pix_key?: string | null
          primary_color?: string
          print_mode?: string
          printer_width?: string
          referred_by_id?: string | null
          scheduling_config?: Json | null
          service_modes?: Json
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
        ]
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
          id: string
          updated_at: string
        }
        Insert: {
          admin_telegram_chat_id?: string | null
          admin_telegram_events?: Json
          apk_url?: string | null
          created_at?: string
          default_trial_days?: number
          delivery_config?: Json
          exe_url?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          admin_telegram_chat_id?: string | null
          admin_telegram_events?: Json
          apk_url?: string | null
          created_at?: string
          default_trial_days?: number
          delivery_config?: Json
          exe_url?: string | null
          id?: string
          updated_at?: string
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
          price_cents?: number
          quarterly_price_cents?: number | null
          sort_order?: number
          webhook_secret_name?: string | null
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
        ]
      }
      referral_bonuses: {
        Row: {
          bonus_days: number
          created_at: string
          id: string
          referred_org_id: string
          referred_org_name: string | null
          referrer_org_id: string
        }
        Insert: {
          bonus_days?: number
          created_at?: string
          id?: string
          referred_org_id: string
          referred_org_name?: string | null
          referrer_org_id: string
        }
        Update: {
          bonus_days?: number
          created_at?: string
          id?: string
          referred_org_id?: string
          referred_org_name?: string | null
          referrer_org_id?: string
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
            foreignKeyName: "referral_bonuses_referrer_org_id_fkey"
            columns: ["referrer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          order_id: string
          organization_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          order_id: string
          organization_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          order_id?: string
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
        ]
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
      whatsapp_instances: {
        Row: {
          connected_at: string | null
          created_at: string
          id: string
          instance_name: string
          instance_token: string
          organization_id: string
          phone_connected: string | null
          status: string
          updated_at: string
          webhook_configured: boolean
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          id?: string
          instance_name: string
          instance_token: string
          organization_id: string
          phone_connected?: string | null
          status?: string
          updated_at?: string
          webhook_configured?: boolean
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          id?: string
          instance_name?: string
          instance_token?: string
          organization_id?: string
          phone_connected?: string | null
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
      [_ in never]: never
    }
    Functions: {
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
      courier_accept_delivery: {
        Args: { _courier_id: string; _delivery_id: string }
        Returns: undefined
      }
      courier_complete_delivery: {
        Args: { _courier_id: string; _delivery_id: string }
        Returns: undefined
      }
      get_effective_plan: { Args: { _org_id: string }; Returns: string }
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
      get_store_status: { Args: { _org_id: string }; Returns: Json }
      get_total_order_count: { Args: never; Returns: number }
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
      resolve_affiliate_code: { Args: { _code: string }; Returns: string }
      validate_coupon_by_code: {
        Args: { _cart_total: number; _code: string; _org_id: string }
        Returns: Json
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
      app_role: ["admin"],
    },
  },
} as const
