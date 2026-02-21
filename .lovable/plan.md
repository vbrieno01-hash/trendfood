

# Adicionar link "Impressora Térmica" na sidebar do dashboard

## Resumo
Adicionar um link para a documentacao da impressora termica (`/docs/impressora-termica`) na secao inferior da sidebar do dashboard, junto com os outros links como "Ver pagina publica", "Instalar App", etc.

## Como vai funcionar
- Um novo link com icone de impressora aparece na secao de acoes no rodape da sidebar
- Posicionado entre "Ver pagina publica" e "Sair" (ou logo antes de "Ver pagina publica")
- Ao clicar, abre a pagina `/docs/impressora-termica` em nova aba
- Estilo discreto, igual ao "Ver pagina publica" (`text-white/50 hover:bg-white/10`)

## Mudancas tecnicas

### Arquivo: `src/pages/DashboardPage.tsx`
1. Adicionar `Printer` na importacao do `lucide-react` (linha 12-17)
2. Adicionar um `<a>` com `href="/docs/impressora-termica"` e `target="_blank"` na secao "Bottom actions" (por volta da linha 394), antes do link "Ver pagina publica"
   - Icone: `Printer`
   - Texto: "Impressora Termica" (ou "Config. Impressora")
   - Classes iguais ao link "Ver pagina publica": `text-white/50 hover:bg-white/10`

