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
          conteudo_txt: string
          created_at: string
          id: string
          order_id: string | null
          organization_id: string
          printed_at: string | null
          status: string
        }
        Insert: {
          conteudo_txt: string
          created_at?: string
          id?: string
          order_id?: string | null
          organization_id: string
          printed_at?: string | null
          status?: string
        }
        Update: {
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
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          organization_id: string
          price: number
        }
        Insert: {
          available?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          organization_id: string
          price: number
        }
        Update: {
          available?: boolean
          category?: string
          created_at?: string
          description?: string | null
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
          apk_url: string | null
          banner_url: string | null
          business_hours: Json | null
          cnpj: string | null
          courier_config: Json | null
          created_at: string
          delivery_config: Json | null
          description: string | null
          emoji: string
          exe_url: string | null
          id: string
          logo_url: string | null
          mp_subscription_id: string | null
          name: string
          onboarding_done: boolean
          paused: boolean
          pix_confirmation_mode: string
          pix_key: string | null
          primary_color: string
          print_mode: string
          printer_width: string
          referred_by_id: string | null
          slug: string
          store_address: string | null
          subscription_plan: string
          subscription_status: string
          trial_ends_at: string | null
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          apk_url?: string | null
          banner_url?: string | null
          business_hours?: Json | null
          cnpj?: string | null
          courier_config?: Json | null
          created_at?: string
          delivery_config?: Json | null
          description?: string | null
          emoji?: string
          exe_url?: string | null
          id?: string
          logo_url?: string | null
          mp_subscription_id?: string | null
          name: string
          onboarding_done?: boolean
          paused?: boolean
          pix_confirmation_mode?: string
          pix_key?: string | null
          primary_color?: string
          print_mode?: string
          printer_width?: string
          referred_by_id?: string | null
          slug: string
          store_address?: string | null
          subscription_plan?: string
          subscription_status?: string
          trial_ends_at?: string | null
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          apk_url?: string | null
          banner_url?: string | null
          business_hours?: Json | null
          cnpj?: string | null
          courier_config?: Json | null
          created_at?: string
          delivery_config?: Json | null
          description?: string | null
          emoji?: string
          exe_url?: string | null
          id?: string
          logo_url?: string | null
          mp_subscription_id?: string | null
          name?: string
          onboarding_done?: boolean
          paused?: boolean
          pix_confirmation_mode?: string
          pix_key?: string | null
          primary_color?: string
          print_mode?: string
          printer_width?: string
          referred_by_id?: string | null
          slug?: string
          store_address?: string | null
          subscription_plan?: string
          subscription_status?: string
          trial_ends_at?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: [
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
          apk_url: string | null
          created_at: string
          default_trial_days: number
          delivery_config: Json
          exe_url: string | null
          id: string
          updated_at: string
        }
        Insert: {
          apk_url?: string | null
          created_at?: string
          default_trial_days?: number
          delivery_config?: Json
          exe_url?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
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
      platform_plans: {
        Row: {
          active: boolean
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
          sort_order: number
          webhook_secret_name: string | null
        }
        Insert: {
          active?: boolean
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
          sort_order?: number
          webhook_secret_name?: string | null
        }
        Update: {
          active?: boolean
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
          created_at: string
          id: string
          min_quantity: number
          name: string
          organization_id: string
          quantity: number
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_quantity?: number
          name: string
          organization_id: string
          quantity?: number
          unit?: string
        }
        Update: {
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
          created_at: string
          id: string
          instance_name: string
          instance_token: string
          organization_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_name: string
          instance_token: string
          organization_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_name?: string
          instance_token?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calc_trial_ends_at: { Args: never; Returns: string }
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
      validate_coupon_by_code: {
        Args: { _cart_total: number; _code: string; _org_id: string }
        Returns: Json
      }
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
