

## Plano: Corrigir erro ao salvar pedido

### Problema
O trigger `notify_new_order` chama `extensions.http_post(...)` que **nao existe**. A funcao correta e `net.http_post(url, body)` com `body` do tipo `jsonb` (nao `text`).

Isso faz o INSERT na tabela `orders` falhar com erro, impedindo qualquer pedido de ser criado.

### Correcao

**1 migracao** que recria a funcao `notify_new_order` usando a assinatura correta:

```sql
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM net.http_post(
      url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/send-push-notification',
      body := json_build_object(
        'organization_id', NEW.organization_id,
        'order_number', NEW.order_number
      )::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;
```

Diferencas:
- `extensions.http_post` → `net.http_post`
- `body` como `jsonb` em vez de `text`
- Remove o parametro `headers` (o default ja e `application/json`)

### Resultado
- 1 migracao
- Pedidos voltam a funcionar imediatamente

