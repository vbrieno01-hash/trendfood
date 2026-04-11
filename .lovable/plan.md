

## Substituir emojis por SVGs animados nos estados vazios do HomeTab

### Problema
Os dois estados vazios na aba Home ainda usam emojis genéricos (`📭` e `💳`) em vez de ilustrações SVG animadas como nos outros empty states do dashboard.

### Arquivo
- `src/components/dashboard/HomeTab.tsx`

### Alterações

1. **Linha 551** — Substituir `<p className="text-3xl mb-2">📭</p>` por um SVG animado de caixa de correio vazia (mailbox) com animação `float` e gradiente radial pulse, consistente com os outros empty states.

2. **Linha 615** — Substituir `<p className="text-3xl mb-2">💳</p>` por um SVG animado de cartão de crédito/pagamento com as mesmas animações (`float` + `pulse`).

Ambos usarão `hsl(var(--muted-foreground))` com opacidade para manter coerência visual com o tema. Zero mudança de lógica.

