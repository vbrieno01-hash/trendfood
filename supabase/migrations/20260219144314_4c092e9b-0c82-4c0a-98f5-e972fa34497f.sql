
CREATE TABLE public.platform_config (
  id           text PRIMARY KEY DEFAULT 'singleton',
  delivery_config jsonb NOT NULL DEFAULT '{"fee_tier1":5,"fee_tier2":8,"fee_tier3":12,"tier1_km":2,"tier2_km":5,"free_above":100}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Inserir linha única
INSERT INTO public.platform_config (id) VALUES ('singleton');

-- Trigger para updated_at
CREATE TRIGGER update_platform_config_updated_at
  BEFORE UPDATE ON public.platform_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: qualquer um pode LER (para o cálculo de frete funcionar na loja pública)
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_config_select_public"
  ON public.platform_config FOR SELECT USING (true);

-- Apenas usuários autenticados podem ATUALIZAR
CREATE POLICY "platform_config_update_authed"
  ON public.platform_config FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
