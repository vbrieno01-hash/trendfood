
# Redesign da Landing Page — Tema Vermelho + Lanches Flutuantes

## Visão Geral

Vamos dar uma reformulação completa na página inicial, deixando-a mais impactante, explicativa e com identidade visual forte de food service. O usuário pediu vermelho, elementos flutuantes de lanches e mais conteúdo explicativo.

## O Que Vai Mudar

### 1. Cor primária: laranja → vermelho

O arquivo `src/index.css` define a cor `--primary` como laranja (`24 95% 53%`). Vamos trocar para um vermelho vibrante de food service:

```
--primary: 0 84% 52%;   /* vermelho tipo Ifood / Rappi */
```

Isso vai afetar automaticamente todos os botões, badges e destaques do site — incluindo o dashboard — mas de forma positiva, já que o vermelho combina muito mais com o universo de lanches.

### 2. Hero com fundo escuro e lanches flutuando

O hero atual é branco e sem personalidade visual. O novo hero terá:

- Fundo escuro/vermelho escuro com gradiente
- Emojis de lanches (🍔 🍕 🌮 🍟 🧇 🍗 🥤 🌭) flutuando com animação CSS `animate-bounce` e `animate-pulse` em posições aleatórias
- Headline maior e mais direta: **"Seu cardápio, turbinado pelos seus clientes"**
- Subtítulo mais explicativo em 2 parágrafos
- Dois botões de CTA principais

### 3. Seção "O Problema que Resolvemos" (nova)

Antes do "Como funciona", vamos adicionar uma seção explicando a dor que o produto resolve:

- 3 cards de problemas comuns: "Não sabe o que lançar?", "Lança e não vende?", "Perde clientes para a concorrência?"
- Cada card tem um emoji e uma descrição curta

### 4. "Como funciona" — mais visual

Os 3 passos existentes ganham setas visuais entre eles e descrições mais detalhadas.

### 5. Seção "Funcionalidades" (nova)

Uma grade de 6 funcionalidades do produto com ícones:

- Mural de sugestões público
- Votação em tempo real
- Gestão de pedidos (mesas/garçom/cozinha)
- Cardápio digital
- Painel de métricas
- QR Code para mesas

### 6. CTA final mais agressivo

Fundo vermelho com texto maior e mais persuasivo.

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `src/index.css` | Trocar `--primary` de laranja para vermelho |
| `src/pages/Index.tsx` | Reescrever toda a landing page |

## Preview Visual do Hero

```
┌─────────────────────────────────────────┐
│  🍔      🍕         🌮       🍟         │
│                                         │
│   TrendFood                    [Login]  │
│                                         │
│  🧇  SEU CARDÁPIO, TURBINADO    🍗      │
│      PELOS SEUS CLIENTES                │
│                                         │
│   Descubra o que seu público quer       │
│   comer. Sugestões + votos em tempo     │
│   real + painel completo de gestão.     │
│                                         │
│  [Começar Grátis →]  [Ver Demo]    🥤   │
│                                         │
│  🌭            🍔         🍕            │
└─────────────────────────────────────────┘
```

## Resultado Esperado

Uma landing page moderna, visualmente impactante, com identidade clara de food service, que explica melhor o produto e converte mais visitantes em cadastros.
