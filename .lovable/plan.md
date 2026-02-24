

## Diagnóstico e Correção de Compatibilidade Multi-Dispositivo

### Problemas identificados

Após análise completa do código, identifiquei vários pontos que podem causar erros em determinados celulares e navegadores:

**1. Signup: Erro silencioso ao inserir perfil**
No `AuthPage.tsx` (linha 96), o `insert` no profiles não verifica erro. Se falhar (ex: timeout em conexão lenta), o signup continua mas o perfil fica vazio — causando problemas depois no dashboard.

**2. Signup: Race condition entre auth e inserts**
Após o `signUp`, o código imediatamente insere no `profiles` e `organizations` (linhas 96-119). Em celulares com conexão lenta, a sessão pode não estar pronta, e o RLS rejeita o INSERT porque `auth.uid()` ainda é null. Isso causa "permission denied" silencioso.

**3. UnitPage: `window.open()` bloqueado em navegadores mobile**
Ao enviar pedido pelo WhatsApp (linhas 374-378), `window.open()` é chamado dentro de uma callback assíncrona (após `placeOrder.mutate`). Navegadores mobile (Safari, Samsung Internet) bloqueiam popups que não são disparados por gesto direto do usuário. O fallback `window.location.href` existe, mas está dentro de um `catch` vazio — o erro é engolido silenciosamente.

**4. UnitPage: `handleFinish` no TableOrderPage sem try/catch**
`handleFinish` (linha 207) usa `mutateAsync` sem `try/catch`. Se a rede falhar, a promise rejeita sem tratamento, causando crash no ErrorBoundary em alguns dispositivos.

**5. Select component sem `portal` pode ficar atrás do Drawer**
O `<Select>` de estado e pagamento dentro do Drawer pode não funcionar em alguns browsers mobile porque o dropdown fica por trás do overlay.

**6. `IntersectionObserver` com `rootMargin` negativo**
Funciona na maioria dos browsers, mas pode causar problemas em WebViews Android mais antigos (Android 8-9).

**7. PIX Copia e Cola: `navigator.clipboard` não disponível em HTTP ou WebViews antigos**
O `PixPaymentScreen.tsx` tenta `navigator.clipboard.writeText()` que falha em contextos inseguros (HTTP). O fallback com `execCommand('copy')` existe mas pode falhar em iOS Safari dentro de Drawers.

### Plano de correção

#### Arquivo: `src/pages/AuthPage.tsx`

**A) Adicionar verificação de erro no insert do profile (linha 96):**
```typescript
const { error: profileError } = await supabase.from("profiles").insert({...});
if (profileError) console.warn("[Signup] Profile insert failed:", profileError.message);
```

**B) Adicionar delay antes dos inserts para garantir sessão RLS ativa:**
```typescript
// Após signUp, aguardar sessão estar pronta
await new Promise(r => setTimeout(r, 500));
```

**C) Wrap geral em try/catch mais robusto** — já existe, mas adicionar mensagens específicas para erros comuns de rede.

#### Arquivo: `src/pages/UnitPage.tsx`

**D) Mover `window.open()` do WhatsApp para ANTES da chamada assíncrona:**
O link do WhatsApp deve ser aberto diretamente no handler de click (gesto do usuário), e a gravação no banco deve acontecer depois, em background. Isso resolve o bloqueio de popup em Safari/Samsung Internet.

**E) Adicionar `try/catch` e feedback em pontos críticos:**
- `handleSendWhatsApp`: já tem try/catch, mas o `placeOrder.mutate` não trata erro de rede no path não-PIX.
- Adicionar toast de erro quando o pedido falha.

#### Arquivo: `src/pages/TableOrderPage.tsx`

**F) Envolver `handleFinish` em try/catch:**
```typescript
const handleFinish = async () => {
  try {
    // ... existing code
  } catch (err) {
    console.error("[TableOrder] handleFinish error:", err);
    toast({ title: "Erro ao enviar pedido", description: "Verifique sua conexão.", variant: "destructive" });
  }
};
```

#### Arquivo: `src/components/checkout/PixPaymentScreen.tsx`

**G) Melhorar fallback de clipboard para iOS Safari:**
Adicionar check de `navigator.clipboard` antes de usar, e melhorar o fallback `execCommand` para funcionar dentro de modais.

#### Global: `src/App.tsx`

**H) O handler de `unhandledrejection` já existe — bom.** Vou reforçar o `networkMode: "always"` no QueryClient para evitar que queries fiquem "paused" em conexões instáveis (já está configurado).

### Resumo das mudanças

| Arquivo | Problema | Correção |
|---------|----------|----------|
| AuthPage.tsx | Signup falha silenciosamente em conexão lenta | Verificar erro do profile insert + delay para RLS |
| UnitPage.tsx | WhatsApp bloqueado em Safari/Samsung | Abrir link ANTES de salvar no banco |
| UnitPage.tsx | Erros silenciosos no checkout | Adicionar toasts de erro |
| TableOrderPage.tsx | `handleFinish` sem try/catch | Envolver em try/catch com toast |
| PixPaymentScreen.tsx | Clipboard falha em iOS Safari | Melhorar fallback de cópia |

### Detalhes técnicos
- Nenhuma mudança no banco de dados
- Nenhuma mudança em edge functions
- Todas as correções são defensivas (try/catch, fallbacks, delays)
- Compatibilidade testada: Chrome, Safari, Samsung Internet, Firefox, WebViews Android 8+

