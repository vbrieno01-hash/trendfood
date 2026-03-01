

## Plano: Remover "Ganhe Desconto" da seção Ajustes

**Arquivo: `src/pages/DashboardPage.tsx`**

Remover a linha 525 que adiciona o item `referral` ("Ganhe Desconto") na lista de itens do grupo "Ajustes" na sidebar. O acesso à aba continuará funcionando pelo botão destacado na parte inferior da sidebar.

Apenas uma linha será removida:
```
{ key: "referral" as TabKey, icon: <Share2 className="w-4 h-4" />, label: "Ganhe Desconto" },
```

Nenhuma outra alteração necessária -- a aba `referral` continuará existindo e sendo renderizada normalmente quando acessada pelo botão inferior.

