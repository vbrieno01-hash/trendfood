
## Plano — Acelerar o carrossel infinito

O problema agora não é travamento: é **velocidade de animação**. O carrossel está andando devagar demais, então passa sensação de “quase parado”.

### Diagnóstico
Hoje o track usa:
- `animation: landing-marquee 25s linear infinite`
- conteúdo triplicado
- deslocamento de `0` até `-33.333%`

Esse setup está correto para loop infinito, mas **25s ficou lento demais** para a largura atual da faixa.

### O que vou ajustar

**1. Acelerar o track principal**
Arquivo: `src/index.css`

- reduzir a duração de `25s` para algo bem mais perceptível, na faixa de **10s a 12s**
- manter `linear infinite` para não dar aceleração/freada
- manter `translate3d(...)` para continuar suave

Exemplo do ajuste:
```css
.landing-marquee-track {
  animation: landing-marquee 12s linear infinite;
}
```

**2. Manter acessibilidade sem parecer parado**
Arquivo: `src/index.css`

Hoje em `prefers-reduced-motion` está em `80s`, que fica praticamente parado.
Vou trocar para uma versão ainda respeitosa, mas visível, algo como **20s a 24s**.

Exemplo:
```css
@media (prefers-reduced-motion: reduce) {
  .landing-marquee-track {
    animation-duration: 22s !important;
  }
}
```

**3. Não mexer na estrutura do componente**
Arquivo: `src/components/landing/MarqueeSocialProof.tsx`

- manter array triplicado
- manter pause no hover
- manter fade nas bordas
- sem alterar conteúdo nem layout

### Resultado
- carrossel visivelmente mais rápido
- loop infinito preservado
- sem impacto no resto da landing
- ajuste pequeno e cirúrgico: basicamente CSS

### Arquivos
- `src/index.css`

Se ao aplicar ainda parecer lento, o próximo passo fino é baixar de `12s` para `10s`, mas a primeira passada já resolve sem deixar agressivo demais.
