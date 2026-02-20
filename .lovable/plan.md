

# Relatório de Vendas Profissional com dados da loja

## Resumo

Transformar o relatório de vendas baixável em um documento profissional que inclui: nome da loja, logo como marca d'água transparente no fundo, dados do estabelecimento (WhatsApp, endereço), e layout corporativo.

## Mudancas

### 1. `src/components/dashboard/ReportsTab.tsx`

**Alterar a interface de props** para receber o objeto `organization` completo ao invés de apenas `orgId`:

```
interface ReportsTabProps {
  orgId: string;
  orgName: string;
  orgLogo?: string | null;
  orgWhatsapp?: string | null;
  orgAddress?: string | null;
  orgEmoji: string;
}
```

**Redesenhar o `handleDownloadReport()`** para gerar um HTML profissional com:

- **Cabecalho**: Logo da loja (se disponivel) + nome + emoji + endereco + WhatsApp
- **Marca d'agua**: Logo da loja centralizada no fundo com `opacity: 0.06`, `position: fixed`, cobrindo toda a pagina
- **Tipografia profissional**: Fonte system-ui com hierarquia clara, cores corporativas
- **Rodape**: "Relatorio gerado em [data/hora] via TrendFood" + linha de separacao
- **Layout**: Margens adequadas para impressao A4, bordas sutis nas tabelas, KPIs em grid 2x2

Estrutura do HTML gerado:
```
- Marca d'agua (logo em background, opacity 6%, centralizada)
- Header: [Logo] Nome da Loja (Emoji)
  - Endereco | WhatsApp
  - "Relatorio de Vendas - Periodo: X dias"
  - Data de emissao
- KPIs em grid 2x2
- Tabela: Comparativo Semanal
- Tabela: Faturamento Diario
- Tabela: Ranking por Item/Categoria
- Rodape: "Gerado via TrendFood"
```

### 2. `src/pages/DashboardPage.tsx`

Atualizar a chamada do `ReportsTab` para passar os dados da organizacao:

```tsx
<ReportsTab
  orgId={organization.id}
  orgName={organization.name}
  orgLogo={organization.logo_url}
  orgWhatsapp={organization.whatsapp}
  orgAddress={organization.store_address}
  orgEmoji={organization.emoji}
/>
```

### Detalhes tecnicos

- A logo e inserida como `<img>` com `position: fixed; opacity: 0.06; width: 60%; top: 50%; left: 50%; transform: translate(-50%,-50%)` para funcionar como marca d'agua na impressao
- Se a loja nao tiver logo, a marca d'agua nao aparece (graceful fallback)
- O cabecalho usa a logo em tamanho pequeno (48px) ao lado do nome
- Endereco formatado limpo (remove delimitadores internos se usar formato pipe)
- WhatsApp formatado com mascara brasileira
- Data de emissao com `toLocaleString("pt-BR")` completo
- Mantido o `window.print()` para gerar PDF nativo
- CSS `@media print` ajustado para margens e quebra de pagina adequadas
