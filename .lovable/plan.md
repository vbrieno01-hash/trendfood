

# Plano: Reduzir tamanho da barra de status fixa no dashboard

## Problema
A barra de status fixa no rodapé do dashboard (linha 870 em `DashboardPage.tsx`) está com elementos grandes demais, cobrindo outros conteúdos como o botão "Sair da conta". Os textos e ícones ocupam espaço excessivo em telas menores.

## O que será feito

### Atualizar `src/pages/DashboardPage.tsx`

1. **Reduzir o padding e tamanho dos elementos** na barra fixa (linha 870):
   - Diminuir padding: `px-4 py-1.5` → `px-3 py-1`
   - Reduzir ícones: `w-3.5 h-3.5` → `w-3 h-3`
   - Adicionar `text-[11px]` no container para texto menor
   - Adicionar `overflow-x-auto` para evitar que a barra empurre elementos
   - Usar `flex-shrink-0` nos separadores e `whitespace-nowrap` nos botões

2. **Abreviar os textos** para ocupar menos espaço horizontal:
   - "Impressão auto. ativa" → "Imp. auto."
   - "Impressão auto. off" → "Imp. off"
   - "Notificações ativas" → "Notif. on"
   - "Notificações off" → "Notif. off"
   - "BT: Desconectada" → "BT: off"

## Seção técnica
```text
Arquivo: src/pages/DashboardPage.tsx
Linhas afetadas: 870-906
Mudanças: reduzir padding, tamanho de fonte/ícones e abreviar textos
```

