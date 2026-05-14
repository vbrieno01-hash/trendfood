# Corrigir o "pulo" do carrossel

## Causa raiz

O track tem `gap-4 md:gap-6` no flex pai E também `gap-4 md:gap-6` dentro de cada grupo. Quando animamos `translate -50%`, esse 50% é metade da largura total — mas a largura total inclui **um gap extra** entre o grupo 1 e o grupo 2. Resultado: o ponto de retorno fica deslocado por meio-gap, gerando o "piscar/voltar" visível.

## Correção

Em `src/components/landing/TopStoresMarquee.tsx`:

1. Remover o `gap` do flex pai (track). Pai vira só `flex` (sem gap).
2. Manter `gap-4 md:gap-6` **dentro** de cada grupo.
3. Adicionar a mesma medida como `mr-4 md:mr-6` em **cada grupo** — assim o espaço entre o último card do grupo 1 e o primeiro do grupo 2 é idêntico ao espaço entre cards normais, e o `translate -50%` cai exatamente no início do grupo 2 (sem desalinho).

Ou seja:

```tsx
<div className="flex landing-marquee-track whitespace-nowrap will-change-transform hover:[animation-play-state:paused]">
  {[0, 1].map((groupIdx) => (
    <div key={groupIdx} className="flex gap-4 md:gap-6 shrink-0 mr-4 md:mr-6" aria-hidden={groupIdx === 1}>
      {stores.map(...)}
    </div>
  ))}
</div>
```

Nada mais muda: tamanhos das logos, duração 40s, keyframe `-50%` continuam iguais.

## Fora do escopo
- Não mexer em CSS, banco, ranking, ou qualquer outro componente.
