

# Plano: Simplificar ao Máximo a Gestão de Assinaturas no Admin

## Problema atual
O fluxo exige: clicar "Gerenciar" → abrir dialog → selecionar plano → selecionar status → abrir calendário → digitar notas → salvar. São muitos passos para algo que deveria ser um clique.

## O que será feito

### 1. Botão "Ativar Pro 30d" direto no card da loja
Um botão de ação rápida no `StoreCard` que com **um único clique** faz:
- Plano → `pro`
- Status → `active`
- Trial → `now + 30 dias`
- Registra no `activation_logs` automaticamente

Sem dialog, sem formulário. Um clique e pronto.

### 2. Seção "Webhook Pronto" na aba Ativações
Um bloco no topo da aba Ativações com:
- O link do webhook completo e pronto para copiar
- Instruções curtas: "Cole esse link no seu gateway (Cakto, Kiwify, Hotmart)"
- Dropdown para selecionar a loja e gerar o link com o `org_id` preenchido
- Botão "Copiar Link" que copia direto para a área de transferência

### 3. Manter o dialog "Gerenciar" como opção avançada
O dialog atual continua disponível para casos que precisam de customização (ex: mudar para Enterprise, definir data específica, adicionar notas).

## Seção técnica

### Arquivos alterados

```text
EDIT: src/pages/AdminPage.tsx
  - Adicionar botão "Ativar Pro 30d" no StoreCard com lógica inline
  
EDIT: src/components/admin/ActivationLogsTab.tsx
  - Adicionar seção "Webhook Pronto" no topo com seletor de org + botão copiar
```

### Lógica do botão rápido (StoreCard)

```typescript
async function quickActivate(orgId: string) {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);
  
  await supabase.from("organizations").update({
    subscription_plan: "pro",
    subscription_status: "active", 
    trial_ends_at: trialEnd.toISOString(),
  }).eq("id", orgId);

  await supabase.from("activation_logs").insert({
    organization_id: orgId,
    old_plan: org.subscription_plan,
    new_plan: "pro",
    source: "manual",
    admin_email: user?.email,
    notes: "Ativação rápida 30d",
  });
}
```

### Seção Webhook na aba Ativações

```text
┌─────────────────────────────────────────────────┐
│  🔗 Link de Ativação Universal                  │
│                                                  │
│  Loja: [Dropdown com todas as lojas ▼]          │
│  Dias: [30]  Plano: [pro ▼]                     │
│                                                  │
│  https://xrzu...webhook?org_id=UUID&days=30&... │
│                                    [📋 Copiar]   │
│                                                  │
│  Cole esse link no webhook do seu gateway.       │
└─────────────────────────────────────────────────┘
```

