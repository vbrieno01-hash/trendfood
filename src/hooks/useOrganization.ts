import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessHoursDay {
  open: boolean;
  from: string;
  to: string;
  break_from?: string;
  break_to?: string;
}

export interface BusinessHours {
  enabled: boolean;
  schedule: Record<string, BusinessHoursDay>;
}

export interface DeliveryConfig {
  fee_1km: number;
  fee_2km: number;
  fee_3km: number;
  fee_4km: number;
  fee_5km: number;
  fee_6km: number;
  fee_7km: number;
  fee_8km: number;
  fee_9km: number;
  fee_10km: number;
  fee_above: number;
  free_above: number;
}

export interface ThemeConfig {
  /** @deprecated Use gradient_color e accent_text_color. Mantido para retro-compatibilidade. */
  secondary_color?: string;
  /** Segunda cor do gradiente do cabeçalho (só usada quando header_style = "gradient") */
  gradient_color?: string;
  /** Cor de textos de destaque (preços, badges, valores) — fallback: secondary_color */
  accent_text_color?: string;
  /** Cor do texto do nome da loja no cabeçalho (sólido/gradiente) — default: branco */
  header_text_color?: string;
  /** Cor de fundo de TODOS os botões e ícones de ação (Add, Adicionar, +, ícone do carrinho, borda do tipo de pedido) — fallback: primary_color */
  button_color?: string;
  /** Cor de fundo das pílulas de categoria ativa, badge "no carrinho" e badge de quantidade no canto da foto — fallback: primary_color */
  category_color?: string;
  header_style?: "solid" | "transparent" | "gradient";
  button_style?: "rounded" | "pill" | "square";
  card_style?: "flat" | "shadow" | "bordered";
  font?: "default" | "modern" | "classic" | "playful" | "roboto" | "poppins" | "opensans";
  /** "auto" = paleta extraída da logo. "manual" = cores definidas pelo lojista. Default: "auto". */
  color_mode?: "auto" | "manual";
  /** Paleta calculada a partir da logo (cache). */
  auto_palette?: {
    primary: string;
    gradient: string;
    accent: string;
    header_text: string;
    logo_hash: string;
  };
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  emoji: string;
  primary_color: string;
  logo_url: string | null;
  user_id: string;
  created_at: string;
  whatsapp?: string | null;
  business_hours?: BusinessHours | null;
  pix_key?: string | null;
  // pix_key removed from public query — use edge function generate-pix-payload
  store_address?: string | null;
  delivery_config?: DeliveryConfig | null;
  pix_confirmation_mode?: "direct" | "manual" | "automatic";
  subscription_status?: string;
  subscription_plan?: string;
  trial_ends_at?: string | null;
  paused?: boolean;
  printer_width?: '58mm' | '80mm';
  banner_url?: string | null;
  courier_config?: { base_fee: number; per_km: number } | null;
  print_mode?: 'browser' | 'desktop' | 'bluetooth';
  cnpj?: string | null;
  force_open?: boolean;
  tax_regime?: string | null;
  category_order?: string[] | null;
  theme_config?: ThemeConfig | null;
  paused_categories?: string[] | null;
  service_modes?: { delivery: boolean; pickup: boolean } | null;
  category_emojis?: Record<string, string> | null;
  whatsapp_bot_allowed?: boolean;
}

export const useOrganization = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["organization", slug],
    queryFn: async () => {
      if (!slug) throw new Error("No slug");
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, description, emoji, primary_color, logo_url, whatsapp, business_hours, store_address, delivery_config, pix_confirmation_mode, paused, printer_width, banner_url, courier_config, print_mode, subscription_status, subscription_plan, trial_ends_at, force_open, tax_regime, category_order, theme_config, paused_categories, service_modes, category_emojis, whatsapp_bot_allowed")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Organization | null;
    },
    enabled: !!slug,
    refetchInterval: 30 * 1000, // Re-fetch a cada 30s para atualizar status (paused, horário)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 15 * 1000,
    // Cliente em 4G instável: tentar várias vezes antes de mostrar erro.
    // Evita que uma única falha de rede tire o cliente da loja.
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
  });
};
