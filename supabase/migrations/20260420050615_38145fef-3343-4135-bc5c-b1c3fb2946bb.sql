-- 1. Ativar o trigger de validação de loja aberta
DROP TRIGGER IF EXISTS tr_validate_store_open ON public.orders;
CREATE TRIGGER tr_validate_store_open
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_store_open_for_order();

-- 2. RPC server-side de status (fonte única da verdade)
CREATE OR REPLACE FUNCTION public.get_store_status(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org RECORD;
  _bh JSONB;
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
  _break_from_min INT;
  _break_to_min INT;
  _day_names TEXT[] := ARRAY['dom','seg','ter','qua','qui','sex','sab'];
  _dow INT;
  _prev_dow INT;
  _is_open BOOLEAN := FALSE;
  _active_day JSONB := NULL;
  _next_open TEXT := NULL;
  _i INT;
  _check_dow INT;
  _check_day JSONB;
BEGIN
  SELECT force_open, paused, business_hours
  INTO _org
  FROM organizations
  WHERE id = _org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('open', false, 'reason', 'not_found');
  END IF;

  IF _org.paused THEN
    RETURN jsonb_build_object('open', false, 'reason', 'paused');
  END IF;

  _bh := _org.business_hours;
  _now_brt := (now() AT TIME ZONE 'America/Sao_Paulo')::timestamp;
  _dow := EXTRACT(DOW FROM _now_brt)::int;
  _day_key := _day_names[_dow + 1];
  _current_minutes := EXTRACT(HOUR FROM _now_brt)::int * 60 + EXTRACT(MINUTE FROM _now_brt)::int;

  -- Force open: aberto mesmo fora do horário, mas respeita pausa do dia
  IF _org.force_open THEN
    _today := _bh->'schedule'->_day_key;
    IF _today IS NOT NULL
       AND _today->>'break_from' IS NOT NULL AND _today->>'break_from' <> ''
       AND _today->>'break_to' IS NOT NULL AND _today->>'break_to' <> ''
    THEN
      _break_from_min := (split_part(_today->>'break_from', ':', 1))::int * 60 + (split_part(_today->>'break_from', ':', 2))::int;
      _break_to_min := (split_part(_today->>'break_to', ':', 1))::int * 60 + (split_part(_today->>'break_to', ':', 2))::int;
      IF _current_minutes >= _break_from_min AND _current_minutes < _break_to_min THEN
        RETURN jsonb_build_object('open', false, 'reason', 'break', 'opens_at', _today->>'break_to');
      END IF;
    END IF;
    RETURN jsonb_build_object('open', true, 'reason', 'force_open');
  END IF;

  -- Sem horários configurados: tratado como aberto (sem restrição)
  IF _bh IS NULL OR (_bh->>'enabled')::boolean IS NOT TRUE THEN
    RETURN jsonb_build_object('open', true, 'reason', 'no_schedule');
  END IF;

  -- Verificar turno cross-midnight do dia anterior
  _prev_dow := (_dow + 6) % 7;
  _prev_day_key := _day_names[_prev_dow + 1];
  _prev_day := _bh->'schedule'->_prev_day_key;

  IF _prev_day IS NOT NULL AND (_prev_day->>'open')::boolean = true THEN
    _prev_from := (split_part(_prev_day->>'from', ':', 1))::int * 60 + (split_part(_prev_day->>'from', ':', 2))::int;
    _prev_to := (split_part(_prev_day->>'to', ':', 1))::int * 60 + (split_part(_prev_day->>'to', ':', 2))::int;
    IF _prev_to = 0 THEN _prev_to := 1440; END IF;
    IF _prev_to < _prev_from AND _current_minutes < _prev_to THEN
      _is_open := TRUE;
      _active_day := _prev_day;
    END IF;
  END IF;

  -- Verificar turno do dia atual
  IF NOT _is_open THEN
    _today := _bh->'schedule'->_day_key;
    IF _today IS NOT NULL AND (_today->>'open')::boolean = true THEN
      _from_min := (split_part(_today->>'from', ':', 1))::int * 60 + (split_part(_today->>'from', ':', 2))::int;
      _to_min := (split_part(_today->>'to', ':', 1))::int * 60 + (split_part(_today->>'to', ':', 2))::int;
      IF _to_min = 0 THEN _to_min := 1440; END IF;

      IF _to_min > _from_min THEN
        IF _current_minutes >= _from_min AND _current_minutes < _to_min THEN
          _is_open := TRUE;
          _active_day := _today;
        END IF;
      ELSE
        IF _current_minutes >= _from_min THEN
          _is_open := TRUE;
          _active_day := _today;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Está aberto: checar pausa
  IF _is_open THEN
    IF _active_day IS NOT NULL
       AND _active_day->>'break_from' IS NOT NULL
       AND _active_day->>'break_to' IS NOT NULL
       AND (_active_day->>'break_from') <> ''
       AND (_active_day->>'break_to') <> ''
    THEN
      _break_from_min := (split_part(_active_day->>'break_from', ':', 1))::int * 60 + (split_part(_active_day->>'break_from', ':', 2))::int;
      _break_to_min := (split_part(_active_day->>'break_to', ':', 1))::int * 60 + (split_part(_active_day->>'break_to', ':', 2))::int;
      IF _current_minutes >= _break_from_min AND _current_minutes < _break_to_min THEN
        RETURN jsonb_build_object('open', false, 'reason', 'break', 'opens_at', _active_day->>'break_to');
      END IF;
    END IF;
    RETURN jsonb_build_object('open', true, 'reason', 'open');
  END IF;

  -- Fechado: descobrir próximo horário de abertura
  -- Se hoje ainda não abriu, próximo é o from de hoje
  _today := _bh->'schedule'->_day_key;
  IF _today IS NOT NULL AND (_today->>'open')::boolean = true THEN
    _from_min := (split_part(_today->>'from', ':', 1))::int * 60 + (split_part(_today->>'from', ':', 2))::int;
    IF _current_minutes < _from_min THEN
      _next_open := _today->>'from';
    END IF;
  END IF;

  -- Senão, varre os próximos 7 dias
  IF _next_open IS NULL THEN
    FOR _i IN 1..7 LOOP
      _check_dow := (_dow + _i) % 7;
      _check_day := _bh->'schedule'->(_day_names[_check_dow + 1]);
      IF _check_day IS NOT NULL AND (_check_day->>'open')::boolean = true THEN
        _next_open := _check_day->>'from';
        EXIT;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('open', false, 'reason', 'closed', 'opens_at', _next_open);
END;
$function$;