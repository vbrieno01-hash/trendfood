
## Teste end-to-end: tela de sucesso da mesa

Vou abrir o preview, navegar até `/dashboard?tab=tables`, clicar numa mesa, montar um pedido, finalizar e tirar screenshot da tela de sucesso para confirmar que:
1. Aparece **apenas** o botão "Voltar para Mesas & Comandas" (sem o "Fazer outro pedido nesta mesa").
2. O botão está bem visível (variant outline, tamanho normal).

### Passos
1. `navigate_to_sandbox` → `/dashboard?tab=tables`
2. `observe` para localizar uma mesa clicável
3. `act` clicar na mesa → vai para `/unidade/{slug}/mesa/{n}`
4. Adicionar item ao carrinho, abrir carrinho, finalizar como Dinheiro (fluxo mais curto, sem PIX)
5. `screenshot` da tela de sucesso
6. Reportar resultado (botão único e visível ou não)

Se algo falhar (login, mesa sem itens, etc.), reporto e sugiro teste manual.
