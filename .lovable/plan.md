

# Marca d'agua TrendFood oficial no relatorio

## Problema

Atualmente a marca d'agua usa a logo da loja do cliente. O correto e usar a logo do **TrendFood** como marca d'agua universal em todos os relatorios, servindo como branding da plataforma para quem ver o documento.

## Mudancas

### `src/components/dashboard/ReportsTab.tsx`

Na funcao `handleDownloadReport()`, alterar a logica da marca d'agua:

- **Marca d'agua**: Sempre usar a logo do TrendFood (`/logo-trendfood.png`) com URL absoluta via `window.location.origin + "/logo-trendfood.png"`. Nao depende mais de `orgLogo`.
- **Header da loja**: Continua mostrando a logo da loja (se existir) + nome + emoji + endereco + WhatsApp normalmente. Isso identifica de qual estabelecimento e o relatorio.
- **Rodape**: Manter "Relatorio gerado via TrendFood" como reforco da marca.

Resultado: toda loja que baixar o relatorio tera a marca d'agua do TrendFood no fundo, independente de ter logo propria ou nao. O cabecalho continua personalizado com os dados da loja.

