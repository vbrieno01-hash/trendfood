

## Plano revisado: OG dinâmico — links antigos continuam funcionando

### Preocupação
Lojas já compartilharam links como `trendfood.lovable.app/unidade/slug` com seus clientes. Esses links **NÃO podem quebrar**.

### Como funciona
- Os links antigos (`/unidade/slug`) **continuam funcionando normalmente**. Nenhuma rota será removida ou alterada.
- A única mudança é que, **a partir de agora**, quando o dono da loja clicar em "Copiar link" ou "Compartilhar", o sistema vai gerar um **novo link** que passa pela edge function de OG.
- Esse novo link, quando aberto, **redireciona instantaneamente** para o mesmo `/unidade/slug` de sempre.
- Clientes antigos com o link antigo salvo: tudo funciona igual, sem mudança.
- Clientes novos recebem o link novo que mostra preview bonito no WhatsApp e redireciona para o mesmo lugar.

```text
Link antigo (continua funcionando):
  trendfood.lovable.app/unidade/rei-do-burguer → abre a loja ✅

Link novo (gerado a partir de agora no "Copiar link"):
  edge-function/og-share/rei-do-burguer
    → WhatsApp lê: logo + nome da loja (preview bonito)
    → Usuário clica: redirecionado para trendfood.lovable.app/unidade/rei-do-burguer ✅
```

### O que será feito

**1. Nova edge function `og-share`** — serve HTML com meta tags OG da loja e redireciona para a URL real

**2. Helper `getShareableStoreUrl`** (`src/lib/shareUrl.ts`) — gera o novo link de compartilhamento

**3. Atualizar botões "Copiar link"** no Dashboard e Courier — usar o novo link apenas para compartilhamento futuro

### Nenhum link antigo será alterado ou removido. Zero risco para clientes existentes.

### Arquivos
- `supabase/functions/og-share/index.ts` — nova edge function
- `src/lib/shareUrl.ts` — helper de URL (novo)
- `src/pages/DashboardPage.tsx` — botão copiar link usa nova URL
- `src/pages/CourierPage.tsx` — se aplicável

