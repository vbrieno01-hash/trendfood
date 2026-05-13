# Trocar imagem de compartilhamento social

## Problema
A imagem que aparece quando o link do TrendFood é compartilhado (WhatsApp, Telegram, Twitter, Facebook) é a logo preta sobre fundo branco — fica pobre e amadora no preview.

## O que vou fazer

1. **Gerar uma nova imagem social profissional 1200×630** (`src/assets/og-trendfood.jpg`) usando o gerador de imagens em qualidade `premium` (texto legível, visual de marketing). Estilo:
   - Fundo escuro com gradiente sutil (laranja/preto, alinhado à brand `#f97316` do `theme-color`)
   - Logo TRENDFOOD em destaque (chapéu de chef + wordmark)
   - Tagline curta: "Delivery próprio. Taxa 0%."
   - Glow/glassmorphism leve combinando com o tema Premium Live do app
   - Layout pensado pra preview de WhatsApp/Twitter (margens seguras)

2. **Substituir as meta tags em `index.html`**:
   - `og:image` e `twitter:image` apontando para o asset novo
   - Adicionar `og:title`, `og:description`, `og:url`, `og:image:width=1200`, `og:image:height=630`, `twitter:title`, `twitter:description` (faltam hoje, ajudam o preview a renderizar bonito)

3. **QA visual**: abrir a imagem gerada, conferir legibilidade do texto, contraste e enquadramento. Se ficar ruim, regenerar.

## Detalhes técnicos
- Arquivo final: `src/assets/og-trendfood.jpg` (JPG ~1200×630, ideal pra OG)
- Importado no `index.html` via caminho `/assets/...` após build (Vite copia da pasta `src/assets` quando referenciado), **ou** colocado em `public/og-trendfood.jpg` para URL estável `/og-trendfood.jpg` — vou usar `public/` porque OG/Twitter precisam de URL absoluta servida direto sem hash de build.
- Cache: redes sociais (WhatsApp/FB) cacheiam OG agressivamente. Vou avisar pra revalidar via Facebook Sharing Debugger / forçar `?v=2` na URL se necessário.

## Fora de escopo
- Trocar o nome "TrendFood" por outro (você ainda não escolheu — fica pra depois se quiser)
- Mudar a logo dentro do app
