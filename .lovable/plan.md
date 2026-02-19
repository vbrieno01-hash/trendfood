
# Atualização Completa da Landing Page

## Problema

A landing page atual está desatualizada e desalinhada com o que o sistema realmente entrega. Ela posiciona o TrendFood como uma ferramenta de "sugestões e votações de clientes", quando na verdade o produto evoluiu para um **sistema completo de gestão de restaurantes**: cardápio digital com QR Code, KDS de cozinha, painel do garçom, caixa com controle de turno, cupons de desconto, mais vendidos, notificações push, impressão térmica e muito mais.

---

## O que existe hoje (foco desatualizado)

| Seção | Problema |
|---|---|
| Hero | "Turbinado pelos seus clientes" — foco errado em sugestões |
| Problema | 3 cards sobre "não saber o que lançar" — irrelevante para o produto atual |
| Como funciona | "3 passos: crie, clientes sugerem, você decide" — descreve só o mural |
| Features | 6 cards com mural de sugestões como destaque principal |
| Demo | Só linka para `/unidade/burguer-da-hora` sem contexto |
| CTA | "Lucrar com o que seus clientes querem" — ainda no ângulo errado |
| Badges | "Votação em tempo real" como destaque — funcionalidade secundária |

---

## O que o sistema realmente entrega (baseado no código)

Tirado do `DashboardPage.tsx`, abas implementadas e hooks existentes:

- **Cardápio Digital** — Monte categorias, preços e fotos; cliente acessa via link
- **Mesas + QR Code** — Cada mesa tem QR Code; cliente pede sem chamar garçom
- **Cozinha (KDS)** — Tela dedicada com som de alerta, notificações push, impressão térmica automática
- **Painel do Garçom** — Visão de mesas ativas, pagamento com PIX integrado
- **Caixa** — Abertura/fechamento de turno, sangrias, conferência de saldo
- **Histórico de Pedidos** — Consulta com filtros
- **Mais Vendidos** — Ranking por período (hoje, 7d, 30d, tudo) com receita
- **Cupons de Desconto** — Criação, ativação/desativação, tipos fixo/percentual
- **Faturamento em Tempo Real** — Dashboard com gráfico dos últimos 7 dias, ticket médio
- **Mural de Sugestões** — Clientes sugerem pratos (funcionalidade secundária, não a principal)
- **Horário de Funcionamento** — Loja com status aberto/fechado automático
- **Impressora Térmica** — Impressão automática 80mm com QR PIX
- **PWA instalável** — App pode ser instalado no celular

---

## Nova narrativa central

**De**: "Descubra o que seu cliente quer comer"
**Para**: "Gerencie seu restaurante inteiro em um só lugar"

Posicionamento: sistema completo de gestão para food service, do pedido à caixa — sem mensalidade cara, sem papelada.

---

## Estrutura da nova landing page

### 1. Hero (reescrito)

Novo headline: **"Gerencie seu restaurante inteiro. Do pedido ao caixa."**

Subtítulo focado em: cardápio digital + pedido por QR Code + cozinha integrada

Badges de prova social atualizados:
- "Cardápio Digital"
- "Pedido por QR Code"
- "Cozinha em Tempo Real"
- "Sem app para instalar"
- "PIX integrado"

Botão principal: "Começar Grátis" → `/auth`
Botão secundário: "Ver cardápio demo" → `/unidade/burguer-da-hora`

---

### 2. Seção de Dores (reescrita)

Substituir pelos problemas reais que o sistema resolve:

| Card | Título | Descrição |
|---|---|---|
| 1 | Anotação em papel e confusão na cozinha | Pedido que chega por papelzinho e se perde — garçom chamando cozinheiro, item errado na mesa |
| 2 | Clientes esperando para pagar | Mesa que fica parada esperando garçom com máquina, sem conseguir fechar a conta |
| 3 | Sem controle do que vende | Fim do mês sem saber qual prato vendeu mais, qual dia faturou menos, quanto entrou no caixa |

---

### 3. Como funciona (reescrito)

4 passos (não mais 3):

```
01 → Crie seu cardápio online
     Monte categorias, preços e fotos em minutos

02 → Gere QR Codes para cada mesa
     Cliente escaneia e faz o pedido direto pelo celular

03 → Cozinha e garçom recebem em tempo real
     KDS com alerta sonoro + impressão automática

04 → Feche o caixa com relatório completo
     Veja faturamento, mais vendidos e controle de turno
```

---

### 4. ShowcaseSection (manter, apenas atualizar textos)

A seção com mockup de laptop e celular já usa screenshots reais — manter mas atualizar os textos laterais para refletir o dashboard atual.

---

### 5. Features (reescrito — 9 cards, grid 3x3)

Substituir os 6 cards atuais pelos módulos reais:

| Ícone | Título | Descrição |
|---|---|---|
| `UtensilsCrossed` | Cardápio Digital | Monte seu menu com categorias, preços e fotos |
| `QrCode` | Pedidos por QR Code | Cada mesa tem QR único; cliente pede sem app |
| `Flame` | Cozinha (KDS) | Tela para a cozinha com alerta sonoro e impressão automática |
| `BellRing` | Painel do Garçom | Visão das mesas ativas e fechamento com PIX |
| `Wallet` | Controle de Caixa | Abra e feche turnos, registre sangrias, confira o saldo |
| `BarChart2` | Mais Vendidos | Ranking de itens por período com receita gerada |
| `Tag` | Cupons de Desconto | Crie promoções com valor fixo ou percentual |
| `TrendingUp` | Faturamento em Tempo Real | Dashboard com gráfico dos últimos 7 dias e ticket médio |
| `Printer` | Impressora Térmica | Impressão automática 80mm com QR Code PIX no recibo |

---

### 6. Seção de Demo (manter estrutura, atualizar texto)

Manter os 2 cards de exemplos (`burguer-da-hora`, `pizza-feliz`) mas atualizar o contexto: em vez de "exemplos ao vivo", mostrar como "veja um cardápio digital de verdade".

---

### 7. CTA Final (reescrito)

**Novo headline**: "Seu restaurante mais organizado a partir de hoje"
**Subtítulo**: "Sem papel, sem confusão, sem app para baixar. Cadastre-se grátis e configure em minutos."

---

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/Index.tsx` | Reescrever todas as seções: Hero, Problemas, Como Funciona, Features, CTA |
| `src/components/landing/ShowcaseSection.tsx` | Atualizar textos laterais (esquerda/direita) para refletir dashboard atual |

Zero novas dependências. Ícones do `lucide-react` já instalados. Imagens do Unsplash já em uso.

---

## Resumo

- 2 arquivos modificados
- Zero novas dependências
- Narrativa atualizada: sistema completo de gestão, não apenas mural de sugestões
- Todas as funcionalidades reais do dashboard representadas
- Design e componentes existentes mantidos (sem quebrar layout)
