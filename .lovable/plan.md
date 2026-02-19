
# Botão "Voltar às Mesas" na Tela de Sucesso

## Contexto

A tela de sucesso ("Pedido enviado! 🎉") em `TableOrderPage.tsx` exibe um botão "Fazer outro pedido" que reseta o carrinho e volta ao cardápio da mesma mesa. 

O usuário é o atendente, e após confirmar o pedido de uma mesa, ele quer ir diretamente de volta à **aba Mesas do Dashboard** para atender a próxima.

## Mudança

### `src/pages/TableOrderPage.tsx` — Tela de sucesso

Substituir o botão "Fazer outro pedido" por dois botões:

1. **"Voltar às Mesas"** (primário) — navega para `/dashboard` com a aba "mesas" ativa via state, para que o dashboard abra direto nessa aba.
2. **"Outro pedido nesta mesa"** (secundário, menor) — mantém o comportamento atual de resetar o carrinho.

```tsx
// Botão principal — volta ao dashboard na aba Mesas
<Button
  onClick={() => navigate("/dashboard", { state: { tab: "mesas" } })}
  className="w-full"
>
  ← Voltar às Mesas
</Button>

// Botão secundário — faz outro pedido na mesma mesa
<Button
  variant="ghost"
  onClick={() => { setCart({}); setNotes(""); setSuccess(false); }}
  className="w-full text-sm text-muted-foreground"
>
  Fazer outro pedido nesta mesa
</Button>
```

## Como o Dashboard recebe o estado de aba

Verifico também se `DashboardPage.tsx` já suporta receber um `state.tab` via `useLocation` para abrir diretamente na aba Mesas — se não suportar, adiciono esse comportamento também.

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `src/pages/TableOrderPage.tsx` | Trocar botão único por dois botões na tela de sucesso |
| `src/pages/DashboardPage.tsx` | (se necessário) Ler `location.state.tab` para abrir na aba correta |
