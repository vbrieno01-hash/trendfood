
# Redesign da Tela de Login/Cadastro — Split Screen Premium

## Problema Atual

A página `/auth` tem um layout centralizado simples: fundo cinza (`bg-background`), logo pequeno no topo e um card com abas "Criar conta / Entrar". Parece genérica e sem identidade visual — exatamente o que o usuário quer mudar.

## Nova Proposta: Split Screen

A tela será dividida em **duas metades lado a lado** no desktop, empilhadas no mobile:

```text
┌────────────────────────────────────────────┐
│  LADO ESQUERDO (50%)   │  LADO DIREITO (50%) │
│  Foto real de comida   │                     │
│  com overlay escuro    │   Formulário de      │
│  vermelho              │   login/cadastro     │
│                        │   (igual ao atual    │
│  Logo TrendFood        │   mas com mais       │
│  + headline            │   refinamento        │
│  + 3 bullets de valor  │   visual)            │
│                        │                     │
└────────────────────────────────────────────┘
```

### Lado Esquerdo — Painel Visual

- **Foto de fundo**: `https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=1200&q=80` (interior de restaurante/bar com iluminação quente e ambiente aconchegante — imagem muito usada no Unsplash)
- **Overlay**: gradiente escuro vermelho `rgba(90,5,5,0.88)` → `rgba(30,5,5,0.92)` para garantir legibilidade
- **Conteúdo sobre o overlay**:
  - Logo TrendFood (ícone branco + nome em branco)
  - Headline grande em branco: *"Transforme o gosto dos seus clientes em lucro"*
  - Subtítulo em branco/70%: *"Colete sugestões, receba votos e lance os pratos que já nascem campeões."*
  - 3 bullets de prova social:
    - ✓ Sem instalação de aplicativo
    - ✓ Mural de sugestões em tempo real
    - ✓ Painel completo de métricas
  - Badge discreto no rodapé: *"Grátis para começar · Sem cartão de crédito"*
- **Visível apenas no desktop** (`hidden lg:flex`) — no mobile só o lado direito aparece

### Lado Direito — Formulário

- Fundo branco/claro puro (`bg-background`)
- No topo no mobile: logo TrendFood pequeno (apenas no mobile, oculto no desktop)
- O formulário atual (abas "Criar conta / Entrar") é **mantido integralmente** — mesma lógica, mesmos campos, mesmos handlers
- Melhorias visuais no formulário:
  - Tirar o card com borda — o formulário fica direto no painel branco com padding generoso
  - As abas ganham estilo mais limpo, sem borda inferior pesada
  - Inputs com `h-11` ao invés de `h-10` (ligeiramente maiores, mais premium)
  - Botão de submit com `h-11 text-base font-bold`
  - Label de termos no rodapé mantida

## Responsividade

- **Mobile** (`< lg`): apenas o painel direito (formulário) com padding. O painel esquerdo some.
- **Desktop** (`>= lg`): split 50/50 com `min-h-screen`

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `src/pages/AuthPage.tsx` | Redesenho completo do layout — split screen. Lógica 100% preservada. |

Nenhuma alteração de banco de dados, rotas ou lógica de autenticação.
