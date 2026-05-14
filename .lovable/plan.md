# Corrigir auto-scroll que parou de andar

## Causa
No tick uso `scroller.scrollLeft += 0.5`. A maioria dos browsers arredonda `scrollLeft` para inteiro, então incrementos < 1px viram 0 e o scroll nunca avança. Por isso o auto-scroll "não voltou" — ele está rodando mas sem se mover.

## Correção
Em `TopStoresMarquee.tsx`, manter uma posição fracionária interna e só atribuir um inteiro ao `scrollLeft`:

```ts
const posRef = useRef(0);
const SPEED = 0.6; // px/frame

const tick = () => {
  const groupWidth = firstGroup.offsetWidth;
  if (groupWidth > 0) {
    if (!pausedRef.current && !reduced) {
      posRef.current += SPEED;
    } else {
      // Sincroniza com scrollLeft real (caso o usuário tenha arrastado)
      posRef.current = scroller.scrollLeft;
    }
    if (posRef.current >= groupWidth) posRef.current -= groupWidth;
    if (posRef.current < 0) posRef.current += groupWidth;
    scroller.scrollLeft = Math.round(posRef.current);
  }
  raf = requestAnimationFrame(tick);
};
```

Bônus: durante o drag (`pausedRef.current === true`), sincronizo `posRef` com o scroll real para que, ao retomar, continue de onde o usuário soltou (sem "pulo de volta").

## Fora do escopo
Nada mais muda — visual, drag, fallback continuam iguais.
