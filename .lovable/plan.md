# Plano: PDF de Recrutamento de Parceiros TrendFood

## Objetivo
Gerar um PDF profissional, persuasivo e mobile-friendly para recrutar parceiros comerciais (afiliados) do TrendFood, com comissão de 50% por venda. O documento precisa **explicar do zero** o que é o TrendFood, para quem nunca ouviu falar.

## Entregável
Arquivo único: `/mnt/documents/TrendFood-Parceiros.pdf` (artifact baixável).

## Identidade Visual
- **Paleta:** Laranja vibrante (#FF6B1A) dominante, Preto profundo (#0E0E10), Branco/Off-white (#FAFAFA), Cinza-grafite (#1F1F23) para blocos secundários.
- **Tipografia:** Títulos Black/Bold (impacto), corpo sans-serif limpo (legibilidade no celular).
- **Estilo:** Cards com cantos arredondados, ícones geométricos, blocos de cor cheia, números gigantes para destacar comissão. Texto curto, escaneável, sem listas longas.

## Estrutura (10 páginas)

**Página 1 — Capa**
Fundo preto com bloco laranja diagonal.
- Título: "TrendFood: A Revolução do Marketing para Restaurantes"
- Subtítulo: "Transforme visualizações em lucro e ganhe 50% de comissão por cada venda"
- Selo: "PROGRAMA DE PARCEIROS 2026"

**Página 2 — O que é o TrendFood (NOVA)**
Explicação direta para quem nunca ouviu falar.
- Headline: "O que é o TrendFood?"
- Frase-resumo: "Uma plataforma SaaS completa que substitui o iFood e dá ao restaurante seu próprio sistema de pedidos online — sem taxas por venda."
- 3 mini-cards:
  1. **Cardápio digital próprio** — link exclusivo da loja, pedidos diretos pelo WhatsApp
  2. **Sistema de cozinha (KDS) e impressão automática** — pedido cai e já imprime
  3. **Marketing automático com vídeos virais** — geramos conteúdo de alta retenção sem o dono mexer um dedo

**Página 3 — Como funciona na prática (NOVA)**
Fluxo visual em 4 etapas numeradas:
1. Restaurante assina o TrendFood
2. Recebe link próprio + cardápio digital + impressora conectada
3. Nossa tecnologia gera vídeos de alta retenção que atraem clientes
4. Pedidos chegam direto, imprimem sozinhos, sem comissão de marketplace

**Página 4 — O Problema**
Header laranja "O PROBLEMA". 3 cards:
- Donos de restaurante não têm tempo para criar conteúdo
- Alcance orgânico está cada vez menor
- iFood cobra até 27% por venda — margem destruída

**Página 5 — A Solução (TrendFood)**
Header "A SOLUÇÃO". Bloco "01, 02, 03":
- Vídeos de alta retenção (estratégia de leitura)
- Automação total — piloto automático
- Tecnologia SaaS pronta para escalar, sem comissão por pedido

**Página 6 — A Oportunidade de Ouro 50/50**
Página com fundo laranja chamativo. Número gigante "50%" centralizado.
- "Você traz o cliente. Nós entregamos a tecnologia."
- Caixa preta: "Você recebe 50% do valor de cada indicação fechada."

**Página 7 — Nossos Planos (Potencial de Ganho)**
Tabela visual com placeholders editáveis:

| Plano | Valor | Sua comissão (50%) |
|---|---|---|
| Pro Mensal | R$ [Valor do Plano] | R$ [Sua Comissão] |
| Pro Trimestral | R$ [Valor do Plano] | R$ [Sua Comissão] |
| Pro Anual | R$ [Valor do Plano] | R$ [Sua Comissão] |
| Enterprise (Mensal/Tri/Anual) | R$ [Valor do Plano] | R$ [Sua Comissão] |

**Página 8 — Por que ser parceiro TrendFood**
4 blocos com ícone:
- Produto de alta demanda (todo restaurante quer)
- Entrega 100% automática (SaaS)
- Você faz seu próprio horário
- Comissão recorrente enquanto o cliente pagar

**Página 9 — Sua função no negócio**
Divisão em 2 colunas:
- **Você faz:** Prospecção + Fechamento
- **Nós cuidamos:** Suporte técnico, infraestrutura, onboarding, gestão do cliente

**Página 10 — CTA Final**
Fundo preto, bloco laranja gigante.
- "Pronto para lucrar com a gente?"
- "Entre para o time."
- WhatsApp em destaque: **(83) 99824-4382**
- QR code apontando para wa.me/5583998244382

## Implementação Técnica
- **ReportLab** (Python) com `Canvas` para controle fino de layout por página.
- **qrcode** lib para o QR do WhatsApp.
- QA visual obrigatório: `pdftoppm` → revisar cada página por overflow, contraste, alinhamento, placeholders intactos.
- Iterar até zero defeitos.

## Após Aprovação
1. Escrever script Python de geração
2. Renderizar PDF
3. QA visual página por página
4. Corrigir e re-renderizar se necessário
5. Entregar via `<lov-artifact>`
