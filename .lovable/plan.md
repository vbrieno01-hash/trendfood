
## Plano — Provar por que o GB “não recebe” e corrigir o fluxo sem depender dos toggles

Os toggles de eventos do GB já estão coerentes com o código atual: no backend, um evento só é bloqueado quando o campo correspondente está explicitamente como `false`. Então, se está tudo ativado, o próximo passo não é mexer nos eventos — é deixar visível **se o Telegram aceitou o envio, para qual conta ele está apontando, e quando foi a última entrega aceita**.

### 1. Destravar o build primeiro
Há um bloqueio de build em componentes com gráficos (`GrowthCharts`, `CourierReportSection`, `HomeTab` e possivelmente outros charts com `recharts`).

Vou corrigir isso antes de qualquer ajuste funcional, padronizando os gráficos para o padrão já existente no projeto (`src/components/ui/chart.tsx` / primitives compatíveis), mantendo o visual atual e eliminando os erros de JSX/TypeScript dos componentes `XAxis`, `YAxis`, `Tooltip`, `Area`, `Bar`.

### 2. Adicionar diagnóstico real de entrega no Admin Telegram
Hoje a aba admin mostra só “mandou” ou “falhou”. Vou adicionar duas confirmações objetivas por destinatário:

**A. Último envio aceito pelo Telegram**
Mostrar na linha do destinatário algo como:

```text
GB
✅ Última mensagem aceita pelo Telegram às 22:17
```

Esse dado virá do `admin_telegram_log` filtrando o último `status = 'sent'` daquele destinatário.

**B. Verificar conta vinculada ao Chat ID**
Adicionar um botão `Verificar conexão` que chama uma nova action `get_chat_info` no backend e retorna os dados reais da conta vinculada ao `chat_id`:

```text
Conectado como: João Silva (@joaosilva)
```

Assim fica claro se:
- o Chat ID é realmente do GB,
- ele deu `/start` na conta correta,
- ou está olhando outro bot / outra conta.

### 3. Melhorar o backend de diagnóstico do bot admin
Em `admin-telegram-notify/index.ts`, vou adicionar uma action read-only:

- `get_chat_info`
  - chama a API do Telegram para o `chat_id`
  - retorna `first_name`, `username`, `type`
  - quando falhar, retorna erro detalhado (`chat not found`, `blocked`, etc.)

Também vou preservar a lógica atual de envio dos eventos, sem mexer nos triggers nem no roteamento dos eventos administrativos.

### 4. Aplicar o mesmo diagnóstico para lojistas
Como você já pediu para verificar os lojistas também, vou espelhar a mesma clareza na aba do lojista:

- mostrar **última mensagem aceita**
- botão **Verificar conexão**
- mostrar **nome/username real da conta vinculada**
- manter o toast inteligente já existente para `chat not found`, `blocked`, etc.

Isso evita o cenário “o painel diz que enviou mas não chegou” também no fluxo das lojas.

### 5. Não mexer no que já está certo
Não vou alterar:
- triggers SQL de eventos admin
- tabela `admin_telegram_recipients`
- watchdog/digest
- lógica de pedidos do lojista em `send-push-notification`
- regra de toggle por evento (ela já está compatível com “ativado = envia”)

## Arquivos que serão ajustados

**Build / charts**
- `src/components/admin/GrowthCharts.tsx`
- `src/components/dashboard/CourierReportSection.tsx`
- `src/components/dashboard/HomeTab.tsx`
- e qualquer outro arquivo com chart que estiver no mesmo erro de build

**Diagnóstico Telegram admin**
- `supabase/functions/admin-telegram-notify/index.ts`
- `src/components/admin/AdminTelegramTab.tsx`

**Diagnóstico Telegram lojista**
- `src/components/dashboard/TelegramTab.tsx`

## Resultado esperado

Depois dessa implementação, na própria interface você vai conseguir ver:

```text
GB
✅ Última msg aceita às 22:17
👤 Conta vinculada: GB Silva (@gbsilva)
```

Se o nome da conta não bater, o problema é Chat ID/conta errada.
Se bater e o Telegram continuar aceitando, então o problema está no app do destinatário (bot silenciado, conversa arquivada, outra sessão, etc.).
E os lojistas passam a ter esse mesmo nível de confirmação.
