

# Redesign da Calculadora de Economia - Visual Profissional

## Problema
A calculadora atual tem visual simples demais: bordas basicas, cores chapadas (rosa/verde), tipografia sem hierarquia forte, e layout que parece template generico.

## Solucao

### Arquivo: `src/components/landing/SavingsCalculator.tsx` - Redesign completo

**1. Fundo da secao**
- Trocar o `bg-secondary/40` por um fundo escuro premium com gradiente (similar ao hero e CTA final), usando tons escuros com overlay sutil
- Textos em branco para contraste

**2. Input de faturamento**
- Estilizar como um campo premium: fundo semi-transparente, borda sutil, texto grande e branco
- Adicionar um slider (range input) embaixo do campo para ajuste rapido com valores pre-definidos (R$ 5.000 a R$ 100.000)
- Label mais descritivo e elegante

**3. Cards de resultado - Layout profissional**
- Em vez de 2 cards rosa iguais lado a lado, usar um layout com mais impacto:
  - Um unico bloco com fundo glass-morphism (backdrop-blur, bg-white/10) mostrando a faixa de perda (de R$ X a R$ Y)
  - Barra de progresso visual mostrando a proporcao do faturamento que vai embora
  - Numeros grandes com animacao de contagem (CSS transition)

**4. Bloco de economia TrendFood**
- Card com borda gradiente (verde para dourado)
- Icone animado ou destaque visual mais sofisticado que o emoji
- Texto "fica com voce" com destaque em gradiente de texto (bg-clip-text)
- Badge "0% comissao" estilizado

**5. Botao CTA**
- Botao branco com texto na cor primaria (invertido do fundo escuro)
- Sombra glow sutil

**6. Detalhes extras**
- Adicionar valores pre-definidos como chips clicaveis abaixo do input (R$ 5.000, R$ 10.000, R$ 20.000, R$ 50.000) para facilitar a interacao
- Remover emoji e usar icones Lucide (TrendingDown para perda, ShieldCheck para economia)

## Resumo tecnico

| Arquivo | Acao |
|---------|------|
| `src/components/landing/SavingsCalculator.tsx` | Reescrever com design premium: fundo escuro, glass cards, chips de valores, barra visual, tipografia forte |

Nenhum novo componente ou dependencia necessaria - tudo com Tailwind e Lucide icons existentes.

