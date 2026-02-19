
# Corrigir Redirecionamento dos QR Codes das Mesas

## Diagnóstico do Problema

Existem **duas páginas de cardápio** no projeto, criando uma divisão que causa confusão:

- **`UnitPage`** (`/unidade/:slug`): Página moderna com carrinho local, checkout via WhatsApp, sugestões, etc.
- **`TableOrderPage`** (`/unidade/:slug/mesa/:tableNumber`): Página antiga e separada, sem o carrinho WhatsApp, sem o design moderno. É para onde os QR Codes apontam.

Quando um cliente escaneia o QR Code de uma mesa, ele cai na `TableOrderPage` (que não tem o checkout WhatsApp e pode gerar erros), enquanto a experiência correta está na `UnitPage`.

---

## Solução

**Unificar tudo na `UnitPage`**, fazendo ela também ler o parâmetro opcional `:tableNumber` da URL. A `TableOrderPage` será removida das rotas ativas (ou redirecionada).

```text
ANTES:
/unidade/:slug          → UnitPage  (moderna, WhatsApp)
/unidade/:slug/mesa/:n  → TableOrderPage (antiga, sem WhatsApp) ← QR Code aponta aqui

DEPOIS:
/unidade/:slug          → UnitPage (mesma página)
/unidade/:slug/mesa/:n  → UnitPage (mesma página, com tableNumber detectado)
```

---

## Mudanças em Detalhe

### 1. `src/App.tsx`
- **Alterar** a rota `/unidade/:slug/mesa/:tableNumber` para apontar para `<UnitPage />` ao invés de `<TableOrderPage />`.
- Remover o import de `TableOrderPage`.

```tsx
// Antes:
<Route path="/unidade/:slug/mesa/:tableNumber" element={<TableOrderPage />} />

// Depois:
<Route path="/unidade/:slug/mesa/:tableNumber" element={<UnitPage />} />
```

### 2. `src/pages/UnitPage.tsx`
Quatro mudanças cirúrgicas:

**a) Ler o `tableNumber` da URL:**
```tsx
const { slug, tableNumber } = useParams<{ slug: string; tableNumber?: string }>();
const tableNum = tableNumber ? parseInt(tableNumber, 10) : null;
```

**b) Mostrar banner discreto de "Você está na Mesa X":**
Adicionar logo abaixo do `<header>`, antes do conteúdo principal, um aviso visível apenas quando `tableNum` estiver presente:
```tsx
{tableNum && (
  <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm font-medium text-amber-800">
    🪑 Você está na Mesa {tableNum}
  </div>
)}
```

**c) Incluir "Pedido da Mesa X" na mensagem do WhatsApp:**
Inserir na função `handleSendWhatsApp`, nas linhas que montam o array `lines`:
```tsx
tableNum ? `🪑 *Mesa:* ${tableNum}` : null,
```
Isso aparece no WhatsApp abaixo do total, antes do nome do cliente.

**d) Ajustar o banner de boas-vindas:**
Quando o cliente vem via mesa, mostrar mensagem contextualizada:
```tsx
<p className="text-muted-foreground text-sm">
  {tableNum
    ? `🪑 Mesa ${tableNum} — Monte seu pedido e envie pelo WhatsApp!`
    : `🛒 Monte seu pedido e envie direto pelo WhatsApp!`}
</p>
```

### 3. `src/components/dashboard/TablesTab.tsx` (opcional mas recomendado)
O `getUrl` já gera `/unidade/${organization.slug}/mesa/${num}`, que agora funcionará corretamente com a `UnitPage`. **Nenhuma mudança necessária aqui** — só garantir que a URL de produção seja usada, não a de preview.

A memória do projeto (`memory/project/public-link-configuration`) já documenta que o domínio correto é `https://snack-hive.lovable.app`. O `TablesTab` usa `window.location.origin`, que em preview pode ser o domínio de preview. Vamos corrigir para usar o domínio de produção fixo:
```tsx
const PRODUCTION_URL = "https://snack-hive.lovable.app";
const getUrl = (num: number) =>
  `${PRODUCTION_URL}/unidade/${organization.slug}/mesa/${num}`;
```

---

## Fluxo Completo Após a Correção

Quando um cliente escanear o QR Code da Mesa 3:

1. Abre `https://snack-hive.lovable.app/unidade/meu-restaurante/mesa/3`
2. `UnitPage` detecta `tableNumber = "3"` via `useParams`
3. Exibe banner: *"🪑 Você está na Mesa 3"*
4. Cliente monta o carrinho normalmente
5. Abre o drawer de checkout
6. Clica em "Enviar Pedido pelo WhatsApp"
7. Mensagem gerada inclui: *"🪑 Mesa: 3"*

---

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `src/App.tsx` | Alterar rota `/mesa/:tableNumber` para usar `UnitPage` |
| `src/pages/UnitPage.tsx` | Ler `tableNumber`, adicionar banner e incluir mesa no WhatsApp |
| `src/components/dashboard/TablesTab.tsx` | Corrigir URL para usar domínio de produção fixo |
| `src/pages/TableOrderPage.tsx` | Sem alteração (pode permanecer como fallback legacy) |
