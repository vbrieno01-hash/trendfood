

## Tema no Checkout/PIX + Mais Fontes

### 1. Expandir opções de fonte

**`src/hooks/useOrganization.ts`** — Adicionar novos valores ao tipo `ThemeConfig.font`:
```
font?: "default" | "modern" | "classic" | "playful" | "roboto" | "poppins" | "opensans";
```

**`src/components/dashboard/StoreProfileTab.tsx`** — Adicionar 3 novos botões no grid de fontes:
- Roboto → `"'Roboto', sans-serif"`
- Poppins → `"'Poppins', sans-serif"`  
- Open Sans → `"'Open Sans', sans-serif"`

Atualizar todos os locais no preview que fazem o mapeamento font → fontFamily para incluir as novas fontes.

**`src/pages/UnitPage.tsx`** — Atualizar:
- O mapeamento `fontMap` no `useEffect` de Google Fonts para carregar Roboto, Poppins e Open Sans
- A variável `fontFamily` para mapear os novos valores

### 2. Aplicar tema no Checkout Drawer

No `UnitPage.tsx`, o checkout drawer (linhas ~1170-1610) já usa `primaryColor` inline. Vou adicionar:

- **`fontFamily`** e **`borderRadius`** (baseados em `buttonRadius`) nos botões do drawer (order type selector, payment selector, submit button)
- **`style={{ fontFamily }}`** no `DrawerContent` wrapper para que todo o texto herde a fonte da loja
- **`borderRadius: buttonRadius`** nos botões + e - do carrinho e nos seletores de tipo de pedido/pagamento

### 3. Aplicar tema no PixPaymentScreen

**`src/components/checkout/PixPaymentScreen.tsx`** — Adicionar props opcionais:
- `fontFamily?: string`
- `buttonRadius?: string`

Aplicar:
- `style={{ fontFamily }}` no container raiz
- `borderRadius: buttonRadius` nos botões (Copiar código, Voltar, Cancelar)
- Manter `primaryColor` que já é passado

**`src/pages/UnitPage.tsx`** — Passar as novas props ao `<PixPaymentScreen>`:
```tsx
fontFamily={fontFamily}
buttonRadius={buttonRadius}
```

### Arquivos modificados
- `src/hooks/useOrganization.ts` — tipo ThemeConfig expandido
- `src/components/dashboard/StoreProfileTab.tsx` — 3 novas fontes no editor + preview
- `src/pages/UnitPage.tsx` — tema no drawer + props extras no PixPaymentScreen
- `src/components/checkout/PixPaymentScreen.tsx` — aceitar e aplicar fontFamily/buttonRadius

### Sem breaking changes
Tudo é opcional com fallback. Lojas existentes continuam iguais.

