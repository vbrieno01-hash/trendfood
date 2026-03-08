

## Plano: Bloquear tradução automática do navegador

Adicionar atributo `translate="no"` e meta tag no `index.html` para impedir que navegadores (Chrome, Edge, etc.) ofereçam ou apliquem tradução automática.

### Alterações em `index.html`
1. Mudar `<html lang="en">` para `<html lang="pt-BR" translate="no">`
2. Adicionar `<meta name="google" content="notranslate">` no `<head>`

Isso cobre Chrome, Edge e outros navegadores baseados em Chromium. O `lang="pt-BR"` também ajuda porque o navegador não vai oferecer tradução se o idioma da página já bate com o idioma do usuário.

