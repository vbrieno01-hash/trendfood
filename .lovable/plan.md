

## Plano: Corrigir posição do rodapé institucional no Dashboard

### Problema
O rodapé com CNPJ está posicionado como um terceiro filho do container `flex w-full` (linha 687), ficando ao lado do sidebar e do conteúdo principal em vez de ficar no final da página. Isso quebra o layout — o texto aparece flutuando à direita.

### Correção

**Arquivo:** `src/pages/DashboardPage.tsx`

Mover o bloco `<footer>` (linhas 1068-1076) para **dentro** do `<main>` (linha 869), no final do conteúdo principal — antes do fechamento `</main>`. Isso garante que o rodapé apareça abaixo de todo o conteúdo da aba ativa, dentro da área de scroll do painel.

### Resultado
- O rodapé fica no final do conteúdo, centralizado e discreto
- Nenhuma mudança visual além da correção de posicionamento
- 1 arquivo editado, 0 migrações

