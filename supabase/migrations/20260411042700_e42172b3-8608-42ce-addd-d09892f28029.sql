
-- 1. Tabela de contadores
CREATE TABLE public.platform_counters (
  id int PRIMARY KEY DEFAULT 1 CONSTRAINT single_row CHECK (id = 1),
  total_orders bigint NOT NULL DEFAULT 0
);

-- 2. Seed com valor atual
INSERT INTO public.platform_counters (id, total_orders)
SELECT 1, count(*) FROM public.orders;

-- 3. RLS: leitura pública, sem escrita via client
ALTER TABLE public.platform_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_counters_select_public"
  ON public.platform_counters FOR SELECT
  USING (true);

-- 4. Trigger para incrementar a cada INSERT em orders
CREATE OR REPLACE FUNCTION public.increment_order_counter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE platform_counters SET total_orders = total_orders + 1 WHERE id = 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_orders
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.increment_order_counter();

-- 5. Atualizar função existente para ler do contador
CREATE OR REPLACE FUNCTION public.get_total_order_count()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT total_orders FROM platform_counters WHERE id = 1; $$;
