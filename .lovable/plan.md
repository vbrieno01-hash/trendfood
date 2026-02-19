
# Ampliar Posicionamento: De "Restaurante" para Qualquer Negócio

## Problema

A landing page usa linguagem exclusiva de food service (restaurante, cozinha, garçom, mesa, prato) em todos os textos. Isso exclui farmácias, mercadinhos, lojas de conveniência, petshops e qualquer outro negócio que queira usar o sistema para vender com QR Code e controlar o caixa.

---

## O que muda no posicionamento

| Antes | Depois |
|---|---|
| "Gerencie seu restaurante inteiro" | "Gerencie seu negócio inteiro" |
| "Sistema completo para food service" | "Sistema completo para qualquer negócio" |
| "Comanda em papel e confusão na cozinha" | "Pedido em papel e confusão no atendimento" |
| "Garçom chamando cozinheiro" | "Atendente sem saber o que o cliente quer" |
| "Cozinha e garçom recebem em tempo real" | "Atendimento recebe o pedido em tempo real" |
| "Cozinha (KDS)" | "Painel de Produção (KDS)" |
| "Painel do Garçom" | "Painel do Atendente" |
| "Crie seu cardápio online" | "Crie seu catálogo online" |
| "Seu restaurante mais organizado" | "Seu negócio mais organizado" |
| "para o food service brasileiro" | "para o comércio brasileiro" |
| Badge hero: "Cozinha em Tempo Real" | "Atendimento em Tempo Real" |

---

## Seção de Exemplos (Demo)

A imagem enviada mostra a seção de demo com apenas "Burguer da Hora" e "Pizza Feliz" — dois exemplos de food service. Precisamos adicionar um terceiro exemplo de farmácia para mostrar diversidade:

| Slug | Nome | Imagem Unsplash |
|---|---|---|
| `burguer-da-hora` | Burguer da Hora | hamburguer (atual) |
| `pizza-feliz` | Pizza Feliz | pizza (atual) |
| `farma-express` | Farma Express | foto de farmácia/medicamentos |

O grid passa de `sm:grid-cols-2 max-w-lg` para `sm:grid-cols-3 max-w-2xl` para comportar 3 cards lado a lado.

O título da seção também muda de "Cardápio digital ao vivo" para **"Catálogo digital ao vivo"**, e o subtítulo de "Acesse um cardápio digital real" para "Acesse um catálogo digital real — sem precisar criar conta".

---

## Seção de Dores (Problems)

Os 3 problemas ficam mais genéricos sem perder a força:

| # | Título | Descrição |
|---|---|---|
| 1 | Pedido em papel e confusão no atendimento | Pedido que chega por papelzinho e se perde — atendente sem saber a fila, item errado, cliente insatisfeito. |
| 2 | Clientes esperando para pagar | Fila parada esperando atendente com maquininha, sem conseguir fechar a conta. Rotatividade baixa, lucro menor. |
| 3 | Sem controle do que vende | Fim do mês sem saber qual produto vendeu mais, qual dia faturou menos, quanto entrou no caixa. Decisões no escuro. |

As imagens do Unsplash permanecem as mesmas (são genéricas o suficiente).

---

## Features: ajuste de 2 cards

| Card atual | Card novo |
|---|---|
| "Cozinha (KDS) — Tela dedicada para a cozinha..." | "Painel de Produção (KDS) — Tela dedicada ao atendimento com alerta sonoro e impressão automática." |
| "Painel do Garçom — Visão de todas as mesas..." | "Painel do Atendente — Visão de todos os pedidos ativos e fechamento de conta com PIX integrado." |
| "Cardápio Digital — Monte seu menu..." | "Catálogo Digital — Monte seu catálogo com categorias, preços e fotos." |
| "Pedidos por QR Code — Cada mesa tem QR único..." | "Pedidos por QR Code — Cada ponto de atendimento tem QR único. O cliente pede sem precisar de app." |

---

## Passos "Como funciona"

| # | Antes | Depois |
|---|---|---|
| 01 | "Crie seu cardápio online" | "Crie seu catálogo online" |
| 02 | "Gere QR Codes para cada mesa" | "Gere QR Codes para cada ponto de atendimento" |
| 03 | "Cozinha e garçom recebem em tempo real" | "Equipe recebe o pedido em tempo real" |
| 04 | sem mudança | sem mudança |

---

## ShowcaseSection

Atualizar o texto lateral direito:

- Antes: "O cliente escaneia o QR Code da mesa e faz o pedido em segundos — direto para a cozinha."
- Depois: "O cliente escaneia o QR Code do ponto de atendimento e faz o pedido em segundos — direto para o painel da equipe."

---

## Hero

- Badge: "Sistema completo para food service" → **"Sistema completo para qualquer negócio"**
- Headline: "Gerencie seu **restaurante** inteiro." → **"Gerencie seu negócio inteiro."**
- Subtítulo 1: "...sem papel e sem app para instalar." — OK, mantém
- Subtítulo 2: "Seu **restaurante** mais organizado a partir de hoje." → **"Seu negócio mais organizado a partir de hoje."**
- Badge proof: "Cozinha em Tempo Real" → **"Atendimento em Tempo Real"**

---

## CTA Final e Footer

- Headline CTA: "Seu **restaurante** mais organizado a partir de hoje" → **"Seu negócio mais organizado a partir de hoje"**
- Footer: "Feito com para o food service brasileiro." → **"Feito com para o comércio brasileiro."**

---

## Arquivos a modificar

| Arquivo | Mudanças |
|---|---|
| `src/pages/Index.tsx` | Hero, badges, problems, steps, features, demo (3 exemplos, grid 3 colunas), CTA, footer |
| `src/components/landing/ShowcaseSection.tsx` | Texto lateral direito |

Zero novas dependências. Nenhuma mudança de banco de dados.

---

## Resumo

- 2 arquivos modificados
- Linguagem genérica e inclusiva para qualquer tipo de negócio
- Farmácia adicionada como terceiro exemplo na seção de demo
- Grid de demos passa para 3 colunas
- Todos os termos "restaurante", "cozinha", "garçom", "mesa", "cardápio" são substituídos por equivalentes neutros onde fazem sentido para o posicionamento amplo
