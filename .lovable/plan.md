

# Plano: Aumentar espaço do header para respeitar a área de notificações

## Problema
O `pt-[env(safe-area-inset-top,12px)]` está substituindo o `py-4` (16px) por apenas 12px em dispositivos sem safe-area, e em dispositivos com tela infinita o valor do `env()` pode ainda ser insuficiente. O header precisa somar o padding próprio **mais** o safe-area inset, não substituir um pelo outro.

## O que será feito

### Atualizar `src/pages/DashboardPage.tsx`

**Linha 781** — Trocar o padding top atual por um que **soma** o safe-area ao padding base:

De:
```
py-4 pt-[env(safe-area-inset-top,12px)]
```

Para:
```
pb-4 pt-[calc(env(safe-area-inset-top,0px)+16px)]
```

Isso garante que o padding-top é sempre **16px + o inset do sistema**. Em dispositivos normais, fica 16px (igual ao `py-4` original). Em telas infinitas, adiciona o espaço da barra de status por cima.

## Seção técnica
```text
Arquivo: src/pages/DashboardPage.tsx
Linha: 781
Mudança: py-4 pt-[env(safe-area-inset-top,12px)] → pb-4 pt-[calc(env(safe-area-inset-top,0px)+16px)]
```

