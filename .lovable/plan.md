
# Corrigir o Link "Ver Página Pública" no Dashboard

## Problema identificado

No arquivo `src/pages/DashboardPage.tsx` (linha 208) e `src/components/dashboard/StoreProfileTab.tsx` (linha 56–57), o domínio base usado para gerar os links públicos está errado:

```
https://snack-hive.lovable.app  ← ERRADO (domínio antigo/incorreto)
```

O domínio correto de produção é:

```
https://trendfood.lovable.app  ← CORRETO
```

Por isso, quando o usuário clica em "Ver página pública" no dashboard (especialmente com o app instalado como PWA), a URL gerada aponta para `snack-hive.lovable.app/unidade/...`, que ou não existe ou não está publicado, causando o comportamento de "pedir para publicar o site".

## Arquivos afetados

| Arquivo | Linha | O que muda |
|---|---|---|
| `src/pages/DashboardPage.tsx` | 208 | Corrigir href do botão "Ver página pública" |
| `src/components/dashboard/StoreProfileTab.tsx` | 56 | Corrigir a constante `PUBLIC_BASE_URL` |

## Mudanças

### 1. `src/pages/DashboardPage.tsx`

Linha 208 — alterar o href de:
```
href={`https://snack-hive.lovable.app/unidade/${organization.slug}`}
```
Para:
```
href={`https://trendfood.lovable.app/unidade/${organization.slug}`}
```

### 2. `src/components/dashboard/StoreProfileTab.tsx`

Linha 56 — alterar a constante de:
```ts
const PUBLIC_BASE_URL = "https://snack-hive.lovable.app";
```
Para:
```ts
const PUBLIC_BASE_URL = "https://trendfood.lovable.app";
```

Isso corrige tanto o botão "Ver página pública" na sidebar quanto o link de cópia na aba "Perfil da Loja".
