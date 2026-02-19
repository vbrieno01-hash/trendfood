

# Atualizar logo do site e icones PWA

## O que sera feito

Usar a nova imagem da coroa vermelha como:

1. **Icone PWA** (instalacao do app) - `pwa-192.png` e `pwa-512.png`
2. **Favicon** do site - `favicon.ico`
3. **Logo no header, footer e demais paginas** - substituir o icone `ChefHat` pela imagem real

## Arquivos impactados

| Arquivo | Mudanca |
|---|---|
| `public/pwa-192.png` | Substituir pelo novo icone |
| `public/pwa-512.png` | Substituir pelo novo icone |
| `public/favicon.ico` | Substituir pelo novo icone |
| `src/assets/logo-icon.png` | Novo - imagem importada como modulo para uso nos componentes React |
| `src/pages/Index.tsx` | Trocar `ChefHat` por `<img>` com a logo no header e footer |
| `src/pages/DashboardPage.tsx` | Trocar `ChefHat` por `<img>` com a logo na sidebar |
| `src/pages/AuthPage.tsx` | Trocar `ChefHat` por `<img>` com a logo no topo |
| `index.html` | Atualizar referencia do favicon para o novo arquivo |

## Detalhes tecnicos

- A imagem sera copiada para `public/` (para PWA/favicon) e `src/assets/` (para import ES6 nos componentes)
- Nos componentes, o `ChefHat` sera substituido por uma tag `<img>` com a logo importada, mantendo o mesmo tamanho (w-4 h-4, w-8 h-8, etc.) e estilo do container
- Os icones PWA usam a pasta `public/` pois sao referenciados no manifest

