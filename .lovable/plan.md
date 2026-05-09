## Problema

Na seção "Quanto você perde por mês?" (`SavingsCalculator`), os valores aparecem com o "R$" colado/sobreposto ao primeiro dígito (ex: "R1.200", "R10.000" embolados em vermelho/verde).

## Causa

O componente `FlipNumber` envolve cada caractere num `<span class="relative inline-block">` e posiciona o filho com `absolute inset-0`. Para dígitos é definido `minWidth: 0.55em`, mas para caracteres não-numéricos (`R`, `$`, `.`, espaço) **nenhuma largura é reservada** — o span colapsa para 0px e o conteúdo absoluto sobrepõe o próximo caractere.

## Correção

Em `src/components/landing/SavingsCalculator.tsx`, ajustar o `FlipNumber` para reservar largura também para os caracteres não-numéricos:

- `R` e `$` → `minWidth: ~0.6em`
- `.` e `,` → `minWidth: ~0.25em`
- espaço → `minWidth: ~0.3em`

Sem mexer em mais nada (texto, cores, animação, layout permanecem iguais). É uma correção pontual de presentation/CSS no mesmo componente.

## Teste

Abrir `/` → rolar até a calculadora → confirmar que "R$ 1.200", "R$ 2.700" e "R$ 10.000" aparecem com espaçamento normal entre o "R$" e os dígitos, e que a animação de flip continua funcionando ao mexer no slider.