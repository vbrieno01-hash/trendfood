## Problema

Em `StoreProfileTab` (aba **Perfil da Loja**), o card **🎨 Tema automático** tem um Switch para desligar o auto-tema. Quando o lojista desliga, aparece só o texto _"Modo manual ativo — defina as cores na seção Aparência abaixo"_ — mas **não existe nenhum seletor de cor manual** ali nem na seção Tema Visual. O cliente fica sem como escolher a cor.

A storefront (`UnitPage.tsx`) já está pronta pra usar `primary_color` quando `color_mode === "manual"` (`useAuto = color_mode !== "manual" && !!autoPalette` → quando manual, cai pro `org.primary_color`). Falta só a UI.

## O que vou fazer

Arquivo único: `src/components/dashboard/StoreProfileTab.tsx`, dentro do card "Tema automático" (linhas 518–628), no ramo `color_mode === "manual"` (linha 625–627).

1. **Substituir** o texto atual por um **bloco de seleção manual de cor**, contendo:
   - Color picker (`<input type="color">` + input hex) controlando `form.primary_color`, reusando o componente `ColorField` já existente em `src/components/dashboard/ColorField.tsx` (mesma UX dos outros campos de cor).
   - **6 swatches de cores prontas** (laranja `#f97316`, vermelho `#dc2626`, rosa `#ec4899`, roxo `#7c3aed`, azul `#2563eb`, verde `#16a34a`) — clique aplica direto em `form.primary_color`.
   - Texto curto: _"Esta cor é usada nos botões, cabeçalho, badges e destaques da sua loja."_
   - Mini-preview 80×40 mostrando a cor aplicada num botão/badge.

2. **Salvamento**: já funciona. `form.primary_color` entra no auto-save (useEffect linha 210 escuta `form`) que persiste em `organizations.primary_color` (linha 231). E `color_mode: "manual"` já é gravado dentro de `theme_config` quando o Switch é desligado (linha 528). Vou só garantir que ao desligar o Switch a cor inicial mostrada seja a `form.primary_color` atual (não precisa de migration).

3. **Verificação visual no preview**:
   - Abrir dashboard → Perfil da Loja → desligar "Tema automático" → confirmar que o seletor aparece, muda `form.primary_color`, dispara o auto-save (chip "Salvando..." → "Salvo") e que recarregando a página a cor persiste.
   - Abrir `/unidade/{slug}` numa aba ao lado e confirmar que botão "Adicionar" / cabeçalho usam a nova cor.

## Fora de escopo

- Não mexer no fluxo auto (extração da logo, paleta neutra, recalcular).
- Não criar migration nem mudar `theme_config` schema — `primary_color` já existe na tabela `organizations`.
- Não tocar em `UnitPage.tsx` nem em `useOrganization.ts` (já consomem corretamente).
