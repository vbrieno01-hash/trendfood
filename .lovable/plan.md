

## Criar Edge Function para o Robo de Impressao

### Problema
O robo Python (`trendfood.py`) precisa da `service_role` key para acessar a tabela `fila_impressao`, o que causa problemas de configuracao e seguranca. Vamos criar uma funcao backend que o robo chama por HTTP simples, usando um token secreto proprio.

### Arquitetura

O robo deixa de acessar o banco diretamente e passa a chamar duas rotas HTTP:

1. **GET** `/printer-queue?org_id=UUID` - Busca pedidos pendentes
2. **POST** `/printer-queue` com body `{ "id": "UUID" }` - Marca como impresso

A autenticacao sera feita por um token secreto (`PRINTER_ROBOT_TOKEN`) enviado no header `Authorization: Bearer <token>`. Esse token sera gerado e armazenado como secret no backend.

### Implementacao

#### 1. Criar secret `PRINTER_ROBOT_TOKEN`
- Gerar um token aleatorio seguro
- Armazena-lo como secret do projeto
- O robo Python usara esse mesmo token no header

#### 2. Criar Edge Function `printer-queue`
- Arquivo: `supabase/functions/printer-queue/index.ts`
- Config: `verify_jwt = false` (usa token proprio)
- **GET**: Usa `SUPABASE_SERVICE_ROLE_KEY` internamente para buscar registros com `status = 'pendente'` filtrados por `organization_id`
- **POST**: Marca o registro como `impresso` com `printed_at`
- Valida o `PRINTER_ROBOT_TOKEN` no header antes de processar

#### 3. Novo `trendfood.py`
- Remove `supabase-py` e `CHAVE_MESTRA`
- Usa apenas `requests` (HTTP puro)
- Chama a Edge Function com o token no header
- Mesmo loop de polling a cada 5 segundos
- Configuracao simplificada: apenas URL da funcao + token

### Detalhes Tecnicos

**Edge Function (pseudo-codigo):**
```text
GET /printer-queue?org_id=XXX
  -> Valida Bearer token
  -> SELECT * FROM fila_impressao WHERE organization_id = org_id AND status = 'pendente'
  -> Retorna JSON

POST /printer-queue  { id: "XXX" }
  -> Valida Bearer token
  -> UPDATE fila_impressao SET status = 'impresso', printed_at = now() WHERE id = XXX
  -> Retorna OK
```

**Python (pseudo-codigo):**
```text
URL = "https://<project>.supabase.co/functions/v1/printer-queue"
TOKEN = "<token configurado>"
headers = { "Authorization": f"Bearer {TOKEN}" }

loop:
  GET URL?org_id=ID_LOJA -> lista pedidos
  para cada pedido: imprimir + POST URL { id: pedido.id }
  sleep 5
```

### Vantagens
- O robo nao precisa mais da `service_role` key
- Token dedicado, facil de revogar/trocar
- Menos dependencias no Python (sem `supabase-py`)
- Seguro: a funcao backend acessa o banco internamente com permissoes controladas

