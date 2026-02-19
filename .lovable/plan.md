

# Feedback visual pos-checkout e teste do fluxo de assinatura

## Situacao atual

O fluxo de assinatura ja funciona tecnicamente:
1. Usuario clica "Assinar Pro" na pagina /planos
2. `create-checkout` cria sessao no Stripe e retorna URL (confirmado nos logs)
3. Apos pagamento, usuario e redirecionado para `/dashboard?checkout=success`
4. `check-subscription` e chamado no carregamento da pagina e sincroniza o plano no banco

O que falta: quando o usuario volta do checkout com `?checkout=success`, nao ha nenhum feedback visual (toast de sucesso) e nenhuma chamada imediata para atualizar o plano.

## O que sera feito

### 1. Adicionar tratamento do parametro `?checkout=success` no DashboardPage

No arquivo `src/pages/DashboardPage.tsx`:

- Detectar o parametro `checkout=success` na URL
- Exibir toast de sucesso: "Assinatura ativada! Bem-vindo ao plano Pro"
- Forcar uma chamada imediata ao `check-subscription` para atualizar o plano no banco
- Atualizar a organizacao local (`refreshOrganization`) para desbloquear funcionalidades Pro
- Limpar o parametro da URL para evitar exibir o toast novamente ao recarregar

### 2. Simular compra para teste

Para testar o fluxo completo com o usuario vendass945, atualizar temporariamente o `subscription_plan` no banco de dados para "pro" e verificar que:
- As funcionalidades bloqueadas (KDS, Cupons, Caixa, Garcom, Mais Vendidos) ficam desbloqueadas
- A secao de assinatura em Configuracoes mostra "Pro" e o botao "Gerenciar assinatura"
- A pagina /planos mostra "Plano atual" no card Pro

### Detalhes tecnicos

No `DashboardPage.tsx`, adicionar um `useEffect` que:

```typescript
useEffect(() => {
  const params = new URLSearchParams(location.search);
  if (params.get("checkout") === "success") {
    toast.success("Assinatura ativada com sucesso! Bem-vindo ao plano Pro 🎉");
    // Forcar verificacao de assinatura
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.functions.invoke("check-subscription", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).then(() => refreshOrganization());
      }
    });
    // Limpar parametro da URL
    navigate("/dashboard", { replace: true });
  }
}, [location.search]);
```

No banco de dados, executar SQL para simular a compra:
```sql
UPDATE organizations 
SET subscription_plan = 'pro', subscription_status = 'active' 
WHERE user_id = '50d70a01-2d3a-495b-ba9c-e49794dbd12d';
```

Depois de testar, reverter para "free" se necessario.

