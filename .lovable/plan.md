

# PWA separada para o Motoboy

## Problema
Quando o motoboy instala o app pelo botao "Instalar", ele instala o TrendFood completo (site principal, landing page, dashboard). O motoboy precisa de um app independente, so com o painel dele.

## Solucao
Criar um manifesto PWA separado exclusivo para a rota `/motoboy`. Quando o motoboy acessar essa pagina, o app troca automaticamente o manifesto para um com nome, icone e `start_url` proprios. Assim, ao instalar, ele recebe um app chamado "Motoboy TrendFood" que abre direto no painel dele.

## O que muda

| Arquivo | Alteracao |
|---------|-----------|
| `public/manifest-courier.json` | **Novo.** Manifesto PWA exclusivo do motoboy com `start_url: "/motoboy"`, nome "Motoboy TrendFood" e icones dedicados. |
| `src/pages/CourierPage.tsx` | Adicionar `useEffect` que troca o `<link rel="manifest">` no `<head>` para apontar ao manifesto do motoboy. Tambem atualiza `theme-color` e titulo da pagina. |

## Detalhes tecnicos

### Manifesto separado (`public/manifest-courier.json`)
```json
{
  "name": "Motoboy TrendFood",
  "short_name": "Motoboy",
  "description": "Painel de entregas para motoboys",
  "theme_color": "#f97316",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/motoboy",
  "scope": "/motoboy",
  "icons": [
    { "src": "/pwa-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/pwa-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

O `start_url` garante que ao abrir o app instalado, ele vai direto para `/motoboy` (sem o parametro `?org=`). O `scope` limita a navegacao ao contexto do motoboy.

### Troca dinamica do manifesto (em `CourierPage.tsx`)
Ao montar a pagina, um `useEffect` vai:
1. Trocar (ou criar) o `<link rel="manifest">` apontando para `/manifest-courier.json`
2. Atualizar o `<title>` para "Motoboy TrendFood"
3. Restaurar o manifesto original ao sair da pagina

### Persistencia do slug da org
Como o `start_url` nao tera `?org=`, o slug da organizacao sera salvo no `localStorage` junto com o courier ID. Assim, ao reabrir o app instalado, o motoboy entra direto no painel da loja dele sem precisar do parametro na URL.

