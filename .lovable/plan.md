

## Substituir ✅ por SVG animado na seção "Aguardando Pagamento"

O emoji ✅ aparece em dois arquivos como estado vazio da seção "Aguardando Pagamento" (quando não há contas em aberto):

### Arquivos
- `src/components/dashboard/WaiterTab.tsx` (linha 394)
- `src/pages/WaiterPage.tsx` (linha 397)

### Implementação
Substituir `<p className="text-3xl mb-2">✅</p>` nos dois arquivos pelo mesmo SVG animado de check-mark circular já usado no WaiterTab empty state (padrão consistente com as outras abas):
- Check circular verde com animação `checkDraw` (traço desenhando)
- Fundo com gradiente radial sutil verde
- Animação `float` suave
- Mantém o texto "Tudo pago! Nenhuma conta em aberto." abaixo

Dois arquivos modificados, zero mudança de lógica.

