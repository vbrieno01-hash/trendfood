

## Plano: Finalizar Landing Page profissional

### 1. Header — adicionar links de navegacao
**`src/pages/Index.tsx`** — Entre a logo e os botoes, adicionar links "Recursos" e "Precos":
- `<a href="#funcionalidades">Recursos</a>` e `<Link to="/planos">Precos</Link>` com estilo `text-white/60 hover:text-white text-sm font-medium`, hidden em mobile
- Trocar "Login" para "Entrar" e "Criar Loja Gratis" para "Comecar Agora"

### 2. Hero — atualizar titulo
**`src/pages/Index.tsx`** — Trocar o H1:
- Linha principal: "O Cardapio Digital que Profissionaliza seu Delivery"
- Subtitulo destacado mantido: "Sem Taxas, Com Gestao Real."

### 3. Cards de Beneficios — nova secao apos o Hero
**`src/pages/Index.tsx`** — Adicionar 3 cards destacados entre o hero e a secao de problemas:
- `Smartphone` — "Cardapio Digital" — "Seu catalogo completo acessivel por QR Code, sem app para baixar."
- `Package` — "Controle de Estoque" — "Gerencie entradas, saidas e estoque minimo com alertas automaticos."
- `CreditCard` — "Pagamento Online" — "PIX integrado direto no pedido, sem maquininha."

Layout: grid de 3 colunas com icone laranja, titulo e descricao.

### 4. Secao de Planos — inline na landing page
**`src/pages/Index.tsx`** — Adicionar secao antes do CTA final:
- Buscar planos da tabela `platform_plans` via `useEffect` + `useState`
- Renderizar `<PlanCard />` para cada plano com `highlighted` e `badge` vindos do banco
- O plano Pro ja tem `badge: "Recomendado"` e `highlighted: true` no banco
- Botao CTA dos planos redireciona para `/planos` (onde o checkout funciona)
- Fallback com `Loader2` enquanto carrega

### 5. Rodape — atualizar copyright
**`src/pages/Index.tsx`** — Trocar texto do footer:
- De: `© 2026 TrendFood. Feito com ❤️ para o comercio brasileiro.`
- Para: `TrendFood © 2026 - Todos os direitos reservados`

### 6. Tabela comparativa — ja atualizada
As cores laranja na `ComparisonSection` ja foram aplicadas na edicao anterior. Nenhuma alteracao necessaria.

### Detalhes tecnicos
- Importar `Smartphone`, `Package`, `CreditCard` de `lucide-react`
- Importar `useState`, `useEffect` de React
- Importar `supabase` de `@/integrations/supabase/client`
- Importar `PlanCard` de `@/components/pricing/PlanCard`
- Reutilizar a funcao `formatPrice` inline (mesma logica do PricingPage)
- Todas as alteracoes ficam em `src/pages/Index.tsx`

