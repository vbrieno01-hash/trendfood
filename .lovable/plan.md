
# Redesign Premium e Minimalista da Calculadora de Economia

## Filosofia
Eliminar toda a estetica de "widget vendedor de curso" e transformar em uma secao limpa de plataforma tech. Menos bordas, menos brilhos, mais tipografia e espaco.

## Mudancas no arquivo `src/components/landing/SavingsCalculator.tsx`

### 1. Fundo da secao
- Remover o gradiente vermelho (`to-[hsl(0,84%,12%)]`) e o overlay radial neon
- Usar um fundo escuro puro e neutro: `from-[#0a0a0a] to-[#111]` sem matizes coloridos
- Sem radial-gradient de cor alguma

### 2. Header
- Remover o badge "Calculadora de economia" com icone (muito widget)
- Titulo `text-3xl md:text-5xl font-semibold` (nao extrabold) em branco puro, sem sombra
- A palavra "perde" em vermelho seco (`text-red-500`) sem gradiente, sem bg-clip-text
- Subtitulo em `text-white/40` mais discreto, fonte menor

### 3. Card container
- Remover `rounded-3xl`, `shadow-2xl`, `backdrop-blur-xl`
- Usar `rounded-2xl border border-white/[0.06] bg-white/[0.02]` - quase invisivel
- Padding generoso: `p-8 md:p-12` para respirar

### 4. Input de faturamento
- Label em `text-xs tracking-widest uppercase text-white/30` (mais discreto)
- Input com fundo `bg-transparent`, apenas borda inferior `border-b border-white/10`
- Sem rounded, sem bg. Texto grande `text-3xl font-medium text-white`
- "R$" em `text-white/20`

### 5. Slider minimalista
- Track: `h-[2px] bg-white/[0.08]` (linha finissima)
- Range: `bg-white/30` (sem cor, sem gradiente)
- Thumb: `h-3 w-3 bg-white border-0` (pequeno, sem borda colorida)
- Sem margem excessiva

### 6. Chips de preset
- Sem bordas, sem sombras
- Ativo: `bg-white/10 text-white` sem shadow-glow
- Inativo: `text-white/30 hover:text-white/60` sem borda, sem fundo

### 7. Bloco de perda (Loss)
- Remover todo o card vermelho (borda vermelha, fundo vermelho, icone em caixa)
- Layout limpo: apenas texto
- Label "Voce perde para o marketplace" em `text-xs uppercase tracking-widest text-white/30`
- Valores em `text-red-500 font-semibold` (vermelho seco, sem gradiente, sem glow)
- Separador horizontal finissimo `border-t border-white/[0.06]` acima e abaixo
- Remover a barra de progresso - substituir por texto simples "12% a 27% de taxa"

### 8. Bloco TrendFood
- Remover a borda gradiente verde/amarela (muito chamativo)
- Remover o icone ShieldCheck em caixa
- Layout: apenas tipografia
- Label "Com o TrendFood" em `text-xs uppercase tracking-widest text-white/30`
- Valor em `text-emerald-400 font-semibold` (verde esmeralda limpo, sem gradiente)
- Texto "fica com voce" como parte natural do texto, sem efeito
- Badge "0% comissao" em `text-emerald-400/60 text-xs` sem fundo, apenas texto

### 9. Botao CTA
- `bg-white text-black rounded-lg` (flat, cantos levemente arredondados)
- Sem `shadow-xl`, sem `shadow-white/10`
- `font-medium` em vez de `font-bold`
- `hover:bg-white/90` simples
- Sem degrades

### 10. Estrutura geral
- Os dois blocos (perda e economia) separados por uma linha fina horizontal
- Mais `py-6` entre secoes internas
- Resultado: layout vertical limpo, editorial, como uma pagina de produto tech (Stripe, Linear, Vercel)

## Resumo visual

| Elemento | Antes | Depois |
|----------|-------|--------|
| Fundo | Gradiente vermelho escuro + overlay neon | Preto neutro puro |
| Badge header | Sim, com icone | Removido |
| Titulo "perde" | Gradiente bg-clip-text | Cor solida red-500 |
| Card | rounded-3xl, shadow-2xl, backdrop-blur | rounded-2xl, borda 1px quase invisivel |
| Input | Caixa com borda e fundo | Apenas borda inferior |
| Slider | Track grosso, cores, thumb grande | Linha 2px, thumb 3x3, branco |
| Loss block | Card vermelho com icone, progress bar | Texto puro, vermelho seco |
| TrendFood | Borda gradiente verde-dourada | Texto puro, verde esmeralda |
| Botao | shadow-xl, glow | Flat branco, sem sombra |
