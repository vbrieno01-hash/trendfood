
# Suporte a impressora termica Bluetooth 58mm

## Contexto

A impressora do cliente e uma termica portatil Bluetooth de 58mm (tipo "MobilePrinter"). O sistema atual ja funciona com `window.print()` em Android + Chrome e em PC com Bluetooth pareado. Porem o layout do recibo esta otimizado para 80mm, o que pode causar corte ou quebra de texto em impressoras de 58mm.

## O que mudar

### 1. Ajustar layout do recibo para 58mm

**Arquivo: `src/lib/printOrder.ts`**

O CSS do recibo esta fixo em `width: 80mm`. Ajustar para detectar ou usar 58mm como padrao (mais comum em portateis Bluetooth):

- Mudar `body { width: 80mm }` para `body { width: 58mm }`
- Reduzir `font-size` base de 14px para 12px
- Reduzir `.store-name` de 16px para 14px
- Reduzir `.mesa` de 22px para 18px
- Reduzir `.total` de 16px para 14px
- Reduzir `.qr-img` de 160px para 120px
- Ajustar `@page { size: 58mm auto }`
- Reduzir padding de `6mm 4mm` para `4mm 2mm`

### 2. Adicionar configuracao de largura da impressora no painel do lojista

**Arquivo: `src/components/dashboard/SettingsTab.tsx`** (ou onde ficam configs da loja)

Adicionar um seletor simples na area de configuracoes:
- Opcoes: "58mm (portatil)" e "80mm (balcao)"
- Salvar na coluna da tabela `organizations` (nova coluna `printer_width` tipo text, default `58mm`)

**Arquivo: `src/lib/printOrder.ts`**
- Receber parametro `printerWidth` (58 ou 80) na funcao `printOrder`
- Aplicar CSS condicional baseado no valor

### 3. Passar configuracao para a funcao de impressao

**Arquivo: `src/pages/KitchenPage.tsx`**
- Buscar `printer_width` da organizacao
- Passar para `printOrder(order, org?.name, pixPayload, printerWidth)`

## Secao tecnica

### Migracao de banco de dados

```sql
ALTER TABLE organizations ADD COLUMN printer_width text NOT NULL DEFAULT '58mm';
```

### `src/lib/printOrder.ts`

Adicionar parametro `printerWidth: '58mm' | '80mm' = '58mm'` na funcao `printOrder`. Usar variaveis CSS condicionais:

```text
58mm: body width 58mm, font 12px, mesa 18px, total 14px, qr 120px, padding 4mm 2mm
80mm: body width 80mm, font 14px, mesa 22px, total 16px, qr 160px, padding 6mm 4mm
```

### `src/components/dashboard/SettingsTab.tsx`

Adicionar Select com label "Largura da impressora" com duas opcoes. Salvar via update na tabela organizations.

### `src/pages/KitchenPage.tsx`

Ler `org?.printer_width` e passar para `printOrder`. Default `58mm` se nao configurado.

### Pagina de documentacao (`/docs/impressora-termica`)

Atualizar instrucoes para mencionar compatibilidade com impressoras Bluetooth 58mm e como parear no Android.
