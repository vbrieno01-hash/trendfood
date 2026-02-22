
# Compactar a Calculadora de Economia

## Problema
A calculadora ficou muito grande na pagina, ocupando espaco demais e forçando scroll excessivo.

## Solucao

### Arquivo: `src/components/landing/SavingsCalculator.tsx`

Reduzir espacamentos e tamanhos para deixar a secao mais compacta, mantendo o visual premium:

1. **Padding da secao**: `py-24` para `py-16`
2. **Margem do header**: `mb-12` para `mb-8`, titulo de `text-3xl md:text-5xl` para `text-2xl md:text-4xl`
3. **Padding do card**: `p-6 md:p-10` para `p-5 md:p-8`
4. **Input**: altura de `h-16` para `h-14`, texto de `text-3xl` para `text-2xl`
5. **Chips**: margem inferior de `mb-10` para `mb-6`
6. **Bloco de perda**: padding de `p-6` para `p-5`, numeros de `text-3xl md:text-4xl` para `text-2xl md:text-3xl`, margem inferior de `mb-4` para `mb-3`
7. **Barra de progresso**: altura de `h-3` para `h-2`
8. **Bloco TrendFood**: padding de `p-6` para `p-5`, texto de `text-3xl md:text-4xl` para `text-2xl md:text-3xl`, margem inferior de `mb-8` para `mb-6`

Resultado: mesma aparencia premium, mas ~30% mais compacta verticalmente.
