

## Plano: Tornar WhatsApp obrigatório no cadastro (AuthPage)

### Situação Atual
- O campo WhatsApp no cadastro está marcado como "(opcional)" (linha 475)
- Não há validação no `handleSignup` para impedir cadastro sem WhatsApp
- O campo já existe no formulário e no state `signupData.whatsapp`

### Mudanças Necessárias

| Arquivo | Mudança |
|---------|---------|
| **AuthPage.tsx** | 1. Remover "(opcional)" do label e marcar como obrigatório<br>2. Adicionar validação no início de `handleSignup` para exigir mínimo de 10 dígitos |

### Implementação

**1. Label do campo (linha 474-475):**
```tsx
// De:
WhatsApp <span className="text-muted-foreground font-normal">(opcional)</span>

// Para:
WhatsApp para pedidos *
```

**2. Validação no handleSignup (após verificação de senhas, ~linha 86):**
```tsx
const whatsappDigits = signupData.whatsapp.replace(/\D/g, "");
if (whatsappDigits.length < 10) {
  toast.error("Informe o WhatsApp com DDD (mín 10 dígitos) para receber pedidos.");
  return;
}
```

### Resultado
- Nenhum novo lojista poderá criar conta sem informar WhatsApp válido
- Garante que todas as lojas novas terão contato para pedidos

