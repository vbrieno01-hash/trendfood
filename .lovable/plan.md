
# Página de Documentação — Impressora Térmica 80mm

## Objetivo

Criar uma página dedicada `/docs/impressora-termica` com guia completo de configuração da impressora térmica 80mm, incluindo requisitos, passo a passo e troubleshooting. Também atualizar o card "Impressora Térmica" no `/admin` para redirecionar para essa página de documentação.

---

## O que será criado

### Nova página: `src/pages/DocsTerminalPage.tsx`

Uma página pública (sem autenticação necessária) acessível em `/docs/impressora-termica`, com layout limpo e organizado em seções:

**Estrutura da página:**

```text
Header
  └── Logo TrendFood + "Documentação" + link "Voltar ao dashboard"

Seção 1 — Visão Geral
  └── O que é, como funciona a impressão no sistema

Seção 2 — Requisitos
  └── Hardware compatível
  └── Sistema operacional / navegador
  └── Configurações necessárias na impressora

Seção 3 — Passo a Passo de Configuração
  Passo 1 → Configurar chave PIX no dashboard (Configurações)
  Passo 2 → Abrir a aba Cozinha (KDS) no dashboard
  Passo 3 → Ativar o toggle "Imprimir automático"
  Passo 4 → Configurar impressora no sistema operacional (tamanho 80mm)
  Passo 5 → Definir a impressora como padrão
  Passo 6 → Testar com um pedido de exemplo

Seção 4 — Exemplo de Recibo
  └── Preview visual de como fica o recibo impresso
  └── Itens mostrados: nome da loja, mesa/entrega, lista de itens, total, QR Code PIX

Seção 5 — Troubleshooting
  └── Problema: popup bloqueado pelo navegador → Solução
  └── Problema: impressão cortando conteúdo → Solução (tamanho de página 80mm)
  └── Problema: QR Code PIX não aparece → Solução (chave PIX não configurada)
  └── Problema: impressão não dispara automaticamente → Solução (toggle)
  └── Problema: acentos/caracteres especiais quebrados → Solução (encoding)

Seção 6 — Impressoras Recomendadas
  └── Cards com modelos populares no Brasil (Elgin i9, Bematech MP-4200, Epson TM-T20X, Daruma DR800)

Footer
  └── Link para suporte via WhatsApp
```

---

## Conteúdo técnico real (baseado na implementação existente)

A documentação refletirá a implementação real do `src/lib/printOrder.ts` e `src/components/dashboard/KitchenTab.tsx`:

- O sistema abre uma **janela popup** (`window.open`) com HTML formatado para 80mm
- O diálogo de impressão é disparado automaticamente via `window.print()` com delay de 500ms
- O QR Code PIX é gerado via biblioteca `qrcode` usando o padrão **EMV/QRCPS-MPM do Banco Central**
- A impressora precisa estar configurada no SO com **tamanho de página 80mm x automático**
- O toggle "Imprimir automático" salva preferência por dispositivo via `localStorage`
- Funciona em qualquer navegador que suporte `window.print()` — Chrome recomendado

---

## Arquivos a criar/modificar

| Arquivo | Ação | Descrição |
|---|---|---|
| `src/pages/DocsTerminalPage.tsx` | Criar | Página de documentação completa |
| `src/App.tsx` | Modificar | Adicionar rota `/docs/impressora-termica` |
| `src/pages/AdminPage.tsx` | Modificar | Card "Impressora Térmica" — `actionLabel: "Ver documentação"`, `actionHref: "/docs/impressora-termica"` |

---

## Design da página

A página usará o mesmo sistema de design do projeto (Tailwind, componentes ui/):

- **Fundo**: `bg-background` (respeita dark mode)
- **Cards de seção**: `bg-card border border-border rounded-2xl`
- **Badges de passos**: números circulares com `bg-primary text-white`
- **Alertas/avisos**: usando o componente `Alert` já existente
- **Código/comandos**: blocos `<code>` com fundo `bg-muted`
- **Ícones**: `lucide-react` já instalado (Printer, CheckCircle2, AlertCircle, Wifi, Monitor, Smartphone, etc.)
- **Responsivo**: funciona bem em mobile e desktop

---

## Rota no App.tsx

```typescript
// Adicionar antes do catch-all
<Route path="/docs/impressora-termica" element={<DocsTerminalPage />} />
```

A página **não requer autenticação** — pode ser acessada diretamente por qualquer link de suporte.

---

## Mudança no card do AdminPage

```typescript
{
  icon: <Printer className="w-5 h-5" />,
  title: "Impressora Térmica",
  description: "Impressão automática de pedidos em impressoras térmicas 80mm com QR Code PIX.",
  status: "beta",
  actionLabel: "Ver documentação",   // era: "Ver no dashboard"
  actionHref: "/docs/impressora-termica", // era: "/dashboard"
},
```

---

## Resumo

- 1 página nova: `DocsTerminalPage.tsx`
- 2 arquivos modificados: `App.tsx` (nova rota), `AdminPage.tsx` (link do card)
- Zero novas dependências
- Página pública, sem autenticação
- Conteúdo 100% baseado na implementação real do sistema
