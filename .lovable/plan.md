## Problema

O card do "web" no hero ainda está mostrando a foto do hambúrguer — isso vem do `heroImageUrl` do CMS (`platform_content.hero_image_url`), que tem prioridade sobre o fallback do dashboard real.

## Solução

Ignorar o `heroImageUrl` do CMS neste card e **sempre** renderizar o dashboard desktop real (o mesmo asset `dashboard-desktop.png` já usado no StickyShowcase).

## Mudança

Em `src/components/landing/HeroCinematic.tsx`, no `<img>` do card dashboard (linhas ~185-190):

```tsx
// antes
<img src={heroImageUrl || dashboardImg} alt="Dashboard TrendFood" loading="eager" ... />

// depois
<img src={dashboardImg} alt="Dashboard TrendFood" loading="eager" ... />
```

Prop `heroImageUrl` continua na interface (não quebra `Index.tsx`), só deixa de ser usada aqui.

## Fora de escopo

- Não mexer em CMS nem remover o campo `hero_image_url` do admin (fica lá caso queira usar em outro lugar futuramente)
- Não mexer em mais nada da página

## Verificação

- Screenshot Playwright do `/` — o card do hero deve mostrar o dashboard escuro do GBflix, não mais o burger
