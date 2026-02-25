

# Plano: Corrigir erro de build + confirmar logo no dashboard

## Situação atual

1. **A logo do chapéu de chef já foi substituída** nos arquivos `src/assets/logo-icon.png` e `public/logo-trendfood.png` — isso já cobre a logo do sidebar do dashboard (linha 676 do `DashboardPage.tsx`).

2. **O erro de build é residual** — o código do `MenuTab.tsx` já foi corrigido (não tem mais `import "@capacitor/app"`), mas o build anterior ficou em cache. O código atual só tem **comentários** mencionando "Capacitor", nenhum import real.

## O que será feito

### 1. Limpar comentários residuais do Capacitor (3 arquivos)
Remover os comentários que mencionam "Capacitor" para evitar confusão no build system:

- **`src/pages/DashboardPage.tsx`** linha 280: remover `// Native APK polling removed (Capacitor removed)`
- **`src/components/dashboard/MenuTab.tsx`** linha 146: simplificar comentário `// Listen for page visibility change`  
- **`src/lib/bluetoothPrinter.ts`** linha 1: simplificar para `// Bluetooth printing — Web Bluetooth only`

### 2. Sobre a logo no OrgSwitcher (onde aparecem as organizações)
A logo que aparece **dentro do OrgSwitcher** (ao lado do nome da organização, ex: "TrendFood", "Mago MCD") vem do **banco de dados** — campo `logo_url` de cada organização. Se quiser trocar essa logo específica, precisa atualizar o campo `logo_url` da organização no banco, ou fazer upload de uma nova logo pela aba "Minha Loja" no dashboard.

## O que NÃO muda
- Nenhuma funcionalidade web é alterada
- A logo do chapéu de chef já está nos arquivos corretos

## Seção técnica
```text
Arquivos editados: 3 (só comentários)
Código funcional alterado: 0 linhas
Objetivo: forçar rebuild limpo sem referências textuais a Capacitor
```

