
CREATE OR REPLACE FUNCTION public.validate_store_open_for_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  _break_from_min INT;
  _break_to_min INT;
  _day_names TEXT[] := ARRAY['dom','seg','ter','qua','qui','sex','sab'];
  _dow INT;
  _prev_dow INT;
  _is_open BOOLEAN := FALSE;
  _active_day JSONB := NULL;
BEGIN
  SELECT force_open, paused, business_hours
  INTO _org
  FROM organizations
  WHERE id = NEW.organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organização não encontrada.'
      USING ERRCODE = 'P0001';
  END IF;

  IF _org.paused THEN
    RAISE EXCEPTION 'Loja pausada no momento. Pedidos não podem ser feitos.'
      USING ERRCODE = 'P0001';
  END IF;

  IF _org.force_open THEN
    RETURN NEW;
  END IF;

  _bh := _org.business_hours;

  IF _bh IS NULL OR (_bh->>'enabled')::boolean IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  _now := now();
  _now_brt := (_now AT TIME ZONE 'America/Sao_Paulo')::timestamp;
  _dow := EXTRACT(DOW FROM _now_brt)::int;
  _day_key := _day_names[_dow + 1];
  _current_minutes := EXTRACT(HOUR FROM _now_brt)::int * 60 + EXTRACT(MINUTE FROM _now_brt)::int;

  -- 1) Verificar turno do dia anterior que cruza meia-noite
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

  -- 2) Verificar turno do dia atual
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
        IF _current_minutes >= _from_min OR _current_minutes < _to_min THEN
          _is_open := TRUE;
          _active_day := _today;
        END IF;
      END IF;
    END IF;
  END IF;

  IF NOT _is_open THEN
    RAISE EXCEPTION 'Loja fechada no momento. Pedidos só podem ser feitos no horário de funcionamento.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3) Verificar intervalo de descanso (break)
  IF _active_day IS NOT NULL
     AND _active_day->>'break_from' IS NOT NULL
     AND _active_day->>'break_to' IS NOT NULL
     AND (_active_day->>'break_from') <> ''
     AND (_active_day->>'break_to') <> ''
  THEN
    _break_from_min := (split_part(_active_day->>'break_from', ':', 1))::int * 60 + (split_part(_active_day->>'break_from', ':', 2))::int;
    _break_to_min := (split_part(_active_day->>'break_to', ':', 1))::int * 60 + (split_part(_active_day->>'break_to', ':', 2))::int;

    IF _current_minutes >= _break_from_min AND _current_minutes < _break_to_min THEN
      RAISE EXCEPTION 'Loja em intervalo de descanso. Retorna às %.',
        _active_day->>'break_to'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
