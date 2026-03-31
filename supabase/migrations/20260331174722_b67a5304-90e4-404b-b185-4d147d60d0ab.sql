
-- Create platform_content table for CMS
CREATE TABLE public.platform_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.platform_content ENABLE ROW LEVEL SECURITY;

-- Public read (landing page needs it)
CREATE POLICY "platform_content_select_public" ON public.platform_content
  FOR SELECT USING (true);

-- Admin-only write
CREATE POLICY "platform_content_update_admin" ON public.platform_content
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "platform_content_insert_admin" ON public.platform_content
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "platform_content_delete_admin" ON public.platform_content
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed with current hardcoded values
INSERT INTO public.platform_content (key, value) VALUES
  ('support_whatsapp', '"5583998244382"'),
  ('hero_title', '"O Cardápio Digital que Profissionaliza seu Delivery"'),
  ('hero_title_highlight', '"Sem Taxas, Com Gestão Real."'),
  ('hero_subtitle', '"Diferente dos marketplaces, aqui o dinheiro fica todo com você. Catálogo digital, entregas com seus motoboys, impressão térmica e controle de caixa — sem pagar 27% pra ninguém."'),
  ('hero_subtitle2', '"Comece grátis em menos de 2 minutos. Seu negócio mais organizado a partir de hoje."'),
  ('hero_cta_text', '"Começar Grátis"'),
  ('hero_badge_text', '"Zero taxas sobre vendas"'),
  ('hero_image_url', '"https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1920&q=80"'),
  ('proof_badges', '["0% comissão","Motoboys próprios","Impressão térmica","PIX integrado","Sem app para baixar"]'),
  ('order_counter_text', '"pedidos feitos no TrendFood"'),
  ('problems_title', '"Você já passou por isso?"'),
  ('problems_subtitle', '"Esses problemas custam dinheiro e clientes todo dia"');
