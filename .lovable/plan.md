

## Plano: Corrigir trigger do banco para respeitar pausa com force_open

### Problema
O código frontend (`storeStatus.ts`) já foi corrigido — a pausa tem prioridade sobre `force_open`. Porém a **trigger do banco** `validate_store_open_for_order` ainda faz `RETURN NEW` imediatamente quando `force_open = true`, permitindo que pedidos passem mesmo durante uma pausa configurada.

### Solução

**Migração SQL** — Atualizar `validate_store_open_for_order` para verificar a pausa **antes** de retornar quando `force_open = true`:

```sql
-- Trocar:
IF _org.force_open THEN
    RETURN NEW;
END IF;

-- Por:
IF _org.force_open THEN
    -- Mesmo com force_open, verificar pausa do dia atual
    _today := _bh->'schedule'->_day_key;
    IF _today IS NOT NULL
       AND _today->>'break_from' IS NOT NULL AND _today->>'break_from' <> ''
       AND _today->>'break_to' IS NOT NULL AND _today->>'break_to' <> ''
    THEN
      _break_from_min := (split_part(_today->>'break_from',':',1))::int*60 + (split_part(_today->>'break_from',':',2))::int;
      _break_to_min := (split_part(_today->>'break_to',':',1))::int*60 + (split_part(_today->>'break_to',':',2))::int;
      IF _current_minutes >= _break_from_min AND _current_minutes < _break_to_min THEN
        RAISE EXCEPTION 'Estamos em pausa. Voltamos às %.', _today->>'break_to'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
    RETURN NEW;
END IF;
```

Isso requer mover a extração de `_now_brt`, `_day_key` e `_current_minutes` para **antes** do bloco `force_open` (atualmente são calculados depois).

### Impacto
- 1 migração SQL
- 0 arquivos de código alterados
- Frontend + backend ficam sincronizados: pausa sempre tem prioridade sobre force_open

