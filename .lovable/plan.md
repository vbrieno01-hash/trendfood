

## Card "Estoque Baixo" com animação pulsante

O card atualmente apenas muda de verde para vermelho quando há insumos baixos. A proposta é adicionar uma animação de pulso (blink/pulsing) ao card quando `lowStockCount > 0`, chamando mais atenção visual.

### Alteração

**Arquivo:** `src/components/dashboard/HomeTab.tsx` (linha 250)

Adicionar a classe `animate-pulse` do Tailwind ao container do card quando `lowStockCount > 0`. Isso fará o card inteiro piscar suavemente (opacidade alternando), criando urgência visual sem ser intrusivo.

A classe nativa `animate-pulse` do Tailwind já está disponível e aplica uma animação de opacidade `2s cubic-bezier(0.4, 0, 0.6, 1) infinite`.

