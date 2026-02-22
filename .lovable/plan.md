

# Redesign Premium da Hero Section

## Objetivo
Transformar a Hero Section atual (fundo estático escuro e genérico) em algo moderno, premium e de alta conversao, mantendo todos os textos originais.

## Mudancas Planejadas

### 1. Fundo Dinamico com Video
- Substituir a imagem estatica do Unsplash por um video em loop (camera lenta, desfocado) de ambiente de restaurante premium
- Usar um video gratuito do Pexels/Coverr como fallback (tag `<video>` com autoplay, muted, loop)
- Sobreposicao escura com gradiente sofisticado (preto/cinza chumbo com toques de vermelho/ambar)
- Efeito glassmorphism sutil no container do conteudo

### 2. Tipografia e Hierarquia
- Titulo "Zero taxas. Zero comissao." em branco puro
- "Seu negocio, seu lucro." com gradiente vermelho-para-laranja quente (via `bg-gradient-to-r` + `bg-clip-text`)
- Subtitulo com tamanho ligeiramente maior, line-height mais generoso e cor cinza clara (`text-white/80`)
- Texto secundario com melhor espacamento

### 3. Botao CTA Premium
- Botao maior com gradiente vermelho moderno (`bg-gradient-to-r from-red-600 to-orange-500`)
- Cantos mais arredondados (`rounded-full`)
- Sombra projetada vibrante para efeito "flutuante"
- Hover com brilho e escala sutil

### 4. Chips Minimalistas
- Remover bordas e fundo marrom dos "proof badges"
- Novo estilo: fundo preto translucido (`bg-black/30`), sem borda, backdrop-blur
- Texto branco/cinza claro, aspecto leve e informativo

### 5. Header Limpo
- Mais espacamento e transparencia
- Botao "Entrar" com contorno sutil e mais elegante
- Efeito glassmorphism na barra de navegacao (`backdrop-blur-md bg-white/5`)

## Detalhes Tecnicos

### Arquivo modificado
- `src/pages/Index.tsx` - Hero Section (linhas ~107-175)

### Abordagem
- Video de fundo usando tag HTML `<video>` com source de video gratuito (Pexels)
- Gradientes CSS via classes Tailwind customizadas e inline styles
- Efeito glassmorphism com `backdrop-blur` do Tailwind
- Animacoes sutis de hover nos botoes
- Sem novas dependencias necessarias

### Video de fundo
- Usar um video curto de restaurante premium (ex: Pexels free stock video)
- Fallback para cor solida caso o video nao carregue
- `poster` com imagem atual como fallback visual

