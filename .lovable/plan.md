
# Tornar os Cards de Mesa Clicáveis na Mesma Aba

## Problema

O card de cada mesa usa `<a href={...} target="_blank">`, o que sempre abre uma nova aba do navegador. O usuário quer que ao clicar no card, a navegação ocorra **dentro do mesmo site**, sem abrir nova aba.

## Solução

Substituir o elemento `<a target="_blank">` por um `<div>` clicável que usa o hook `useNavigate` do React Router para navegar internamente para `/unidade/[slug]/mesa/[numero]`.

Os botões de ação (QR Code, Copiar, Excluir) continuam funcionando normalmente com `e.stopPropagation()`.

## Mudanças em `src/components/dashboard/TablesTab.tsx`

**a) Importar `useNavigate`:**
```tsx
import { useNavigate } from "react-router-dom";
```

**b) Usar o hook dentro do componente:**
```tsx
const navigate = useNavigate();
```

**c) Trocar `<a href target="_blank">` por `<div onClick>` com navigate interno:**
```tsx
<div
  key={t.id}
  onClick={() => navigate(`/unidade/${organization.slug}/mesa/${t.number}`)}
  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card
             hover:border-primary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
>
  {/* ... conteúdo ... */}
  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
    {/* botões QR, Copiar, Excluir — sem preventDefault, apenas stopPropagation */}
  </div>
</div>
```

O `e.stopPropagation()` no container dos botões impede que o clique nos ícones dispare o `onClick` do card pai.

## Resultado Esperado

| Ação | Comportamento |
|---|---|
| Clicar no card da mesa | Navega para o cardápio da mesa **na mesma aba** |
| Clicar no ícone QR Code | Abre modal do QR (sem navegar) |
| Clicar no ícone Copiar | Copia o link (sem navegar) |
| Clicar no ícone Excluir | Abre confirmação de exclusão (sem navegar) |

## Arquivo Afetado

| Arquivo | Ação |
|---|---|
| `src/components/dashboard/TablesTab.tsx` | Trocar `<a target="_blank">` por `<div onClick={navigate(...)}>` |
