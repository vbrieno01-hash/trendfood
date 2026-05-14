## Esconder painel de Homologação para lojistas

O painel de "Status de Homologação iFood" (com checklist, botão **Baixar documentação**, botão **Abrir ticket no Portal**, e dica de categoria) na aba iFood do dashboard fica visível pra qualquer lojista hoje. Esse conteúdo só faz sentido pra você (dono do app distribuído) — quem abre ticket no iFood Developer Portal é o admin, não o cliente final.

### Decisão: gating in-place na própria aba iFood

Mantenho o painel onde está (`src/components/dashboard/IFoodTab.tsx`), mas envolvo só o bloco de homologação num check `isAdmin`. Lojista comum continua vendo Conexão (Merchant ID, Conectar, Forçar polling) e Últimos eventos — que ele precisa pra operar a integração da loja dele.

Não duplico o painel no AdminPage porque:
- O painel já depende do contexto da org conectada ao iFood (Merchant ID, status do polling), que é por loja
- Você acessa o dashboard normalmente como admin, então vê tudo num lugar só
- Evita manter dois lugares com a mesma documentação

### Mudanças

**`src/components/dashboard/IFoodTab.tsx`**
- Importar `useAuth` e desestruturar `isAdmin`
- Envolver o `<Card>` do "Status de Homologação iFood" (linhas ~204-247) num `{isAdmin && (...)}`
- Inclui dentro: checklist dos 11 requisitos, botão Baixar docs, botão Abrir ticket, dica do ticket

Nenhuma outra mudança — Conexão e Últimos eventos continuam públicos pra todo lojista.
