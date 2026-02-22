

# Hero Section - Tema Delivery de Lanches e Hamburgueria

## Objetivo
Transformar a Hero Section para focar 100% em delivery de lanches e hamburgueria, com visual apetitoso e profissional.

## Mudancas no arquivo `src/pages/Index.tsx`

### 1. Fundo com imagem de hamburguer
- Remover o video de fundo atual
- Substituir por uma foto profissional de hamburguer artesanal do Unsplash (alta qualidade, tons quentes, profundidade de campo)
- Imagem estatica com `object-cover` para preencher toda a area

### 2. Overlay com gradiente escuro
- Gradiente linear da esquerda para a direita (mais escuro na esquerda onde fica o texto, mais transparente na direita para revelar o hamburguer)
- Tons escuros com leve toque quente (marrom/ambar escuro) para combinar com a tematica de lanches

### 3. Botao CTA laranja vibrante
- Trocar o gradiente vermelho atual por um laranja vibrante estilo iFood/Burger King
- Gradiente `from-orange-500 to-orange-600` com sombra laranja projetada
- Hover com escala sutil e brilho

### 4. Pills de destaque
- Manter fundo preto translucido (`bg-black/40`)
- Adicionar borda fina branca (`border border-white/20`)
- Texto branco/cinza claro

### 5. Textos e tipografia
- Manter todos os textos originais sem alteracao
- Manter o gradiente vermelho-laranja no "Seu negocio, seu lucro."
- Fonte sans-serif robusta (ja em uso com a configuracao atual)

## Detalhes Tecnicos

### Arquivo modificado
- `src/pages/Index.tsx` - apenas a Hero Section (secao com tag `<video>` e conteudo hero)

### Mudancas especificas
1. Remover a tag `<video>` e substituir por uma tag `<img>` com foto de hamburguer do Unsplash
2. Ajustar o overlay div para usar gradiente linear da esquerda para direita
3. Alterar classes do botao CTA de `from-red-600 to-orange-500` para `from-orange-500 to-orange-600`
4. Ajustar shadow do botao para tom laranja
5. Adicionar `border border-white/20` nos proof badges

### Imagem de fundo
- Usar foto do Unsplash de hamburguer artesanal com tons quentes e profundidade de campo
- URL exemplo: `https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1920&q=80` (hamburguer artesanal close-up)
- Poster/fallback com cor solida escura caso a imagem nao carregue

