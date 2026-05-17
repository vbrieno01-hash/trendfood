## Objetivo

Você quer **ver a tela** que acabei de criar (loading futurista + "Sinal fraco"), mas ela só aparece em condições reais (chunk demorando >250ms ou >8s). Vou criar uma **rota de preview temporária** só pra visualização.

## O que fazer

Criar `src/pages/_PreviewFallback.tsx` (rota interna, não-listada) com:

- Dois botões no topo: **"Loading (estágio 1)"** e **"Sinal fraco (estágio 2)"**.
- Renderiza o JSX exato dos estágios 1 e 2 do `RouteFallback` (extraído de `App.tsx`) — assim você vê 1:1 como aparece pro cliente.
- Botão "Voltar" pro `/`.

Registrar rota em `App.tsx`:
```tsx
<Route path="/_preview/fallback" element={<PreviewFallback />} />
```

## Como acessar

Depois de aprovar, abrir no preview: **`/_preview/fallback`** (pode digitar na barrinha de rota do print que você mandou).

## Importante

- Rota oculta, com prefixo `_preview` — não aparece em menus, não é indexável.
- Zero impacto em produção (cliente final não chega lá).
- Quando terminar de ver, posso remover a rota — é só pedir.

Aprovar pra eu criar?