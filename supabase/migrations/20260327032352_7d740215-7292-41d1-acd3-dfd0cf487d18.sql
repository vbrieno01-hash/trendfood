
-- 1) Função de validação: verifica se a loja está aberta antes de aceitar pedido
CREATE OR REPLACE FUNCTION public.validate_store_open_for_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org RECORD;
  _bh JSONB;
  _now TIMESTAMPTZ;
  _now_brt TIMESTAMP;
  _day_key TEXT;
  _prev_day_key TEXT;
  _today JSONB;
  _prev_day JSONB;
  _current_minutes INT;
  _from_min INT;
  _to_min INT;
  _prev_from INT;
  _prev_to INT;
  _day_names TEXT[] := ARRAY['dom','seg','ter','qua','qui','sex','sab'];
  _dow INT;
  _prev_dow INT;
  _is_open BOOLEAN := FALSE;
BEGIN
  -- Buscar dados da org
  SELECT force_open, paused, business_hours
  INTO _org
  FROM organizations
  WHERE id = NEW.organization_id;

  -- Se não achou a org, bloqueia
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organização não encontrada.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Loja pausada = sempre bloqueia
  IF _org.paused THEN
    RAISE EXCEPTION 'Loja pausada no momento. Pedidos não podem ser feitos.'
      USING ERRCODE = 'P0001';
  END IF;

  -- force_open = sempre permite
  IF _org.force_open THEN
    RETURN NEW;
  END IF;

  _bh := _org.business_hours;

  -- Se business_hours não configurado ou não habilitado, permite (sem controle)
  IF _bh IS NULL OR (_bh->>'enabled')::boolean IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Calcular horário de Brasília (UTC-3)
  _now := now();
  _now_brt := (_now AT TIME ZONE 'America/Sao_Paulo')::timestamp;
  _dow := EXTRACT(DOW FROM _now_brt)::int; -- 0=dom, 6=sab
  _day_key := _day_names[_dow + 1]; -- arrays são 1-indexed em pg
  _current_minutes := EXTRACT(HOUR FROM _now_brt)::int * 60 + EXTRACT(MINUTE FROM _now_brt)::int;

  -- 1) Verificar turno do dia anterior que cruza meia-noite
  _prev_dow := (_dow + 6) % 7;
  _prev_day_key := _day_names[_prev_dow + 1];
  _prev_day := _bh->'schedule'->_prev_day_key;

  IF _prev_day IS NOT NULL AND (_prev_day->>'open')::boolean = true THEN
    _prev_from := (split_part(_prev_day->>'from', ':', 1))::int * 60 + (split_part(_prev_day->>'from', ':', 2))::int;
    _prev_to := (split_part(_prev_day->>'to', ':', 1))::int * 60 + (split_part(_prev_day->>'to', ':', 2))::int;
    -- 00:00 como fechamento = 1440
    IF _prev_to = 0 THEN _prev_to := 1440; END IF;
    -- Cruza meia-noite: prevFrom > prevTo
    IF _prev_to < _prev_from AND _current_minutes < _prev_to THEN
      _is_open := TRUE;
    END IF;
  END IF;

  -- 2) Verificar turno do dia atual
  IF NOT _is_open THEN
    _today := _bh->'schedule'->_day_key;
    IF _today IS NOT NULL AND (_today->>'open')::boolean = true THEN
      _from_min := (split_part(_today->>'from', ':', 1))::int * 60 + (split_part(_today->>'from', ':', 2))::int;
      _to_min := (split_part(_today->>'to', ':', 1))::int * 60 + (split_part(_today->>'to', ':', 2))::int;
      IF _to_min = 0 THEN _to_min := 1440; END IF;

      IF _to_min > _from_min THEN
        -- Turno normal (ex: 08:00 às 22:00)
        IF _current_minutes >= _from_min AND _current_minutes < _to_min THEN
          _is_open := TRUE;
        END IF;
      ELSE
        -- Turno cruza meia-noite (ex: 22:00 às 02:00)
        IF _current_minutes >= _from_min OR _current_minutes < _to_min THEN
          _is_open := TRUE;
        END IF;
      END IF;
    END IF;
  END IF;

  IF NOT _is_open THEN
    RAISE EXCEPTION 'Loja fechada no momento. Pedidos só podem ser feitos no horário de funcionamento.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Trigger BEFORE INSERT em orders
CREATE TRIGGER tr_validate_store_open
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_store_open_for_order();

-- 3) Backfill: lojas antigas sem business_hours recebem grade padrão
UPDATE organizations
SET business_hours = jsonb_build_object(
  'enabled', true,
  'schedule', jsonb_build_object(
    'seg', jsonb_build_object('open', true, 'from', '08:00', 'to', '22:00'),
    'ter', jsonb_build_object('open', true, 'from', '08:00', 'to', '22:00'),
    'qua', jsonb_build_object('open', true, 'from', '08:00', 'to', '22:00'),
    'qui', jsonb_build_object('open', true, 'from', '08:00', 'to', '22:00'),
    'sex', jsonb_build_object('open', true, 'from', '08:00', 'to', '22:00'),
    'sab', jsonb_build_object('open', true, 'from', '08:00', 'to', '22:00'),
    'dom', jsonb_build_object('open', true, 'from', '08:00', 'to', '22:00')
  )
)
WHERE business_hours IS NULL;

-- 4) Default para novas lojas
ALTER TABLE organizations
ALTER COLUMN business_hours
SET DEFAULT '{"enabled":true,"schedule":{"seg":{"open":true,"from":"08:00","to":"22:00"},"ter":{"open":true,"from":"08:00","to":"22:00"},"qua":{"open":true,"from":"08:00","to":"22:00"},"qui":{"open":true,"from":"08:00","to":"22:00"},"sex":{"open":true,"from":"08:00","to":"22:00"},"sab":{"open":true,"from":"08:00","to":"22:00"},"dom":{"open":true,"from":"08:00","to":"22:00"}}}'::jsonb;
