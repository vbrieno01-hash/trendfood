

## Comparação: Dashboard da Loja vs Painel Admin

### O que o Dashboard da loja tem (20 abas):

| Aba | Existe no Admin? |
|-----|-----------------|
| Home (resumo da loja) | ❌ |
| Cardápio (CRUD itens, categorias, imagens, addons) | ❌ |
| Mesas & Comandas | ❌ |
| Cozinha (KDS) | ❌ |
| Gestão de Pedidos (Garçom) | ❌ |
| Motoboys (cadastro, entregas) | ❌ |
| Histórico de pedidos | ❌ |
| Estoque & Insumos | ❌ |
| Fluxo de Caixa | ❌ |
| Precificação | ❌ |
| Relatórios | ❌ |
| Cupons | ❌ |
| Mais Vendidos | ❌ |
| Dados da Loja (perfil, endereço, delivery, QR Code) | ❌ |
| Assinatura / Plano | ✅ Parcial (ManageSubscriptionDialog) |
| Impressora Térmica | ❌ |
| Funcionalidades | ✅ (lista estática) |
| Como Usar (Guia) | ✅ |
| Configurações (PIX, horários) | ❌ |
| Indicações | ✅ |

### O que falta no Admin — funcionalidades que te fariam parar de "ir até a loja":

1. **Visualizar/Editar o cardápio de qualquer loja** — adicionar, remover, reordenar itens, mudar preços, imagens
2. **Ver pedidos e histórico de qualquer loja** — acompanhar em tempo real
3. **Editar dados da loja** — nome, slug, endereço, WhatsApp, horário de funcionamento, delivery config, PIX
4. **Gerenciar cupons** de qualquer loja
5. **Ver relatórios e mais vendidos** de qualquer loja
6. **Gerenciar mesas** de qualquer loja
7. **Ver/Gerenciar estoque** de qualquer loja
8. **Ver fluxo de caixa** de qualquer loja

### Plano de implementação (priorizado pelo impacto)

**Fase 1 — Gestão direta de loja pelo Admin** (maior impacto)

Criar uma nova aba no Admin: **"Gerenciar Loja"** — ao clicar em uma loja no grid, abre um painel com as abas mais úteis da loja, reutilizando os mesmos componentes do Dashboard:

- **`src/pages/AdminPage.tsx`**: Adicionar estado `selectedOrg` e nova aba `"gerenciar"` na sidebar
- **Componente novo `src/components/admin/AdminStoreManager.tsx`**: Container que recebe a org selecionada e renderiza sub-abas usando os mesmos componentes existentes:
  - `MenuTab` — editar cardápio
  - `StoreProfileTab` — editar dados, endereço, delivery
  - `HistoryTab` — ver pedidos
  - `CouponsTab` — gerenciar cupons
  - `BestSellersTab` — ver mais vendidos
  - `TablesTab` — gerenciar mesas
  - `StockTab` — ver estoque
  - `CaixaTab` — ver caixa
  - `SettingsTab` — configurações PIX/horários

**Mudanças técnicas necessárias:**
- Os componentes do Dashboard já recebem `organization` ou `orgId` como prop — basta passar a org selecionada
- Como o admin já tem RLS policy de admin em quase todas as tabelas, as operações de leitura funcionam. Para escrita, já existem policies de owner — o admin precisará das policies de UPDATE/DELETE com `has_role(auth.uid(), 'admin')` nas tabelas que ainda não têm (verificar caso a caso)
- Adicionar botão "Gerenciar" no `StoreCard` existente

**Fase 2 — Melhorias complementares**
- Ver relatórios consolidados de todas as lojas (visão plataforma)
- Painel de pedidos em tempo real de todas as lojas

### Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/components/admin/AdminStoreManager.tsx` | **Criar** — container com sub-abas reutilizando componentes |
| `src/pages/AdminPage.tsx` | Modificar — adicionar aba "gerenciar", estado selectedOrg, botão no StoreCard |
| Migração SQL | Adicionar RLS policies de admin UPDATE/INSERT onde faltam (menu_items, orders, coupons, etc.) |

### Resultado
Ao clicar em qualquer loja → abre painel completo com todas as abas da loja dentro do Admin. Você nunca mais precisa sair do painel admin para gerenciar uma loja.

