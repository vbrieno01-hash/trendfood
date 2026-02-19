
# Tornar os Cards de Mesa Clicáveis

## Problema

Na aba "Mesas" do dashboard, cada card de mesa exibe três ícones (QR Code, Copiar Link, Excluir), mas clicar na área principal do card ou no número/nome da mesa **não faz nada**. O usuário espera que clicar na mesa abra a página do cardápio daquela mesa.

Além disso, há um bug de indentação em `UnitPage.tsx` na linha 43 — o `useParams` está fora do nível de indentação correto, o que pode causar falhas silenciosas de parsing.

---

## O Que Será Feito

### 1. `src/components/dashboard/TablesTab.tsx` — Card clicável

Três melhorias no card de cada mesa:

**a) O card inteiro vira clicável:**
O `<div>` do card será transformado em um wrapper que abre o link da mesa ao clicar (exceto quando o clique for nos botões de ação).

**b) Adicionar botão "Abrir" explícito:**
Um link visível com ícone `ExternalLink` ao lado do número da mesa, abrindo `/unidade/[slug]/mesa/[numero]` em nova aba.

**c) Estilo hover no card:**
Adicionar `cursor-pointer hover:border-primary/40 hover:bg-secondary/50 transition-colors` no card para dar feedback visual de que é clicável.

A estrutura final ficará assim:

```tsx
<a
  href={getUrl(t.number)}
  target="_blank"
  rel="noopener noreferrer"
  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card
             hover:border-primary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
  onClick={(e) => {
    // Impede propagação quando clica nos botões de ação
  }}
>
  {/* número, nome, url */}
  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
    {/* botões QR, Copiar, Excluir */}
  </div>
</a>
```

O truque é usar um `<a>` como wrapper do card completo, e nos botões de ação usar `e.stopPropagation()` para que o clique neles não dispare a navegação.

### 2. `src/pages/UnitPage.tsx` — Correção de bug de indentação

Na linha 43, o `useParams` está com indentação errada (nível 0 ao invés de 2 espaços), o que é tecnicamente válido em JS mas inconsistente e pode causar confusão em ferramentas de linting:

```tsx
// Antes (linha 43 sem indentação correta):
const { slug, tableNumber } = useParams<{ slug: string; tableNumber?: string }>();

// Depois (indentação correta dentro do componente):
  const { slug, tableNumber } = useParams<{ slug: string; tableNumber?: string }>();
```

---

## Resultado Esperado

| Ação do usuário | Comportamento |
|---|---|
| Clicar no card da mesa (área geral) | Abre `/unidade/slug/mesa/N` em nova aba |
| Clicar no ícone QR Code | Abre modal do QR (sem abrir nova aba) |
| Clicar no ícone Copiar | Copia o link (sem abrir nova aba) |
| Clicar no ícone Excluir | Abre confirmação de exclusão (sem abrir nova aba) |
| Hover no card | Borda e fundo mudam levemente para indicar que é clicável |

---

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `src/components/dashboard/TablesTab.tsx` | Tornar card clicável com `<a>` wrapper + hover styles + `stopPropagation` nos botões de ação |
| `src/pages/UnitPage.tsx` | Corrigir indentação do `useParams` |
