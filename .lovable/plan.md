

## Plano: Atualizar funcionalidades nos planos (DB + Landing + FeaturesTab)

### Problema
As listas de funcionalidades estão desatualizadas e inconsistentes entre 3 locais:
1. **Banco de dados** (`platform_plans.features`) — faltam Delivery Próprio, Fidelidade, Precificação
2. **Landing page** (`Index.tsx` `defaultFeatures`) — falta Delivery Próprio e Programa de Fidelidade
3. **FeaturesTab** — já está atualizada (última edição adicionou Fidelidade)

### Mudanças

| # | Local | O que |
|---|-------|-------|
| 1 | **Migração SQL** | Atualizar `platform_plans.features` para os 3 planos com as listas completas e atuais |
| 2 | **`src/pages/Index.tsx`** | Adicionar "Delivery Próprio" e "Programa de Fidelidade" no `defaultFeatures` |

### Novas listas de features por plano (banco de dados)

**Grátis** (sem mudanças):
- Catálogo digital, Até 20 itens, 1 QR Code, Pedidos por QR Code, Link compartilhável, Pagamento apenas na entrega, Selo TrendFood

**Pro** (adicionar 2 itens):
- Tudo do plano Grátis
- Itens ilimitados, QR Codes ilimitados, Adicionais ilimitados
- Pagamento Online (PIX/Cartão), Retirada da marca TrendFood
- KDS, Caixa, Cupons, Mais vendidos, Impressora térmica, Painel do Atendente
- **+ Delivery Próprio**
- **+ Programa de Fidelidade**

**Enterprise** (adicionar 1 item):
- Tudo do plano Pro
- Múltiplas unidades, Gestão de Insumos/Ficha Técnica, Baixa automática de estoque
- Relatórios avançados, Suporte prioritário, Gerente dedicado
- **+ Precificação / Ficha Técnica**

### Landing page (`defaultFeatures`)
Adicionar 2 itens:
- `{ title: "Delivery Próprio", description: "Receba pedidos de delivery sem taxas. Gestão de motoboys e rastreamento em tempo real." }`
- `{ title: "Programa de Fidelidade", description: "Sistema de pontos por compra com troca automática por descontos." }`

### Resultado
- 1 migração SQL (UPDATE nas features dos 3 planos)
- 1 arquivo editado (`Index.tsx`)
- Funcionalidades consistentes em todos os locais

