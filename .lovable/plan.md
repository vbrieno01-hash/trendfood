
# Reformulação Visual da Landing Page — Fotos Reais, Zero Emojis

## Diagnóstico do Problema

O usuário apontou corretamente que a página atual parece genérica demais. Os culpados:

1. **Emojis flutuando no hero** (🍔 🍕 🌮 🍟 🧇 🍗 🥤 🌭 🍩 🥪) — parecem feitos com IA, nada profissional
2. **Cards de "problemas" com emojis grandes** (🤷 📉 😤) — visual infantil
3. **Cards de "demo" com emojis** (🍔 🍕) — muito genérico
4. **CTA final com emojis decorativos** (🍔 🍕 🌮 🍟) — mesma sensação
5. **Hero sem imagem de produto real** — texto puro no escuro, nada para fixar o olhar

## O Que Vai Mudar

### 1. Hero Section — de emojis para foto real de hambúrguer/lanche

Substituir os emojis flutuantes por **uma foto de fundo real** de comida apetitosa do Unsplash (hamburger premium, com boa iluminação). A foto ficará em modo overlay escuro atrás do texto, criando profundidade sem competir com o conteúdo.

Usar URL do Unsplash:
```
https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1920&q=80
```
(hambúrguer premium, muito famosa no Unsplash, lighting profissional)

Layout do hero reformulado:
- Foto em `position: absolute`, `object-cover`, com overlay gradiente escuro-vermelho por cima
- Header e texto continuam exatamente iguais (hierarquia e copy não mudam)
- Os "social proof chips" ficam, apenas sem o ícone Star — um traço simples `-` ou nada
- **Remove** o `<style>` com `@keyframes bounce` e todo o array `floatingEmojis`

### 2. Seção "Você já passou por isso?" — emojis viram fotos reais

Cada card de problema ganha uma foto real de culinária/restaurante no lugar do emoji gigante:

| Card | Foto Unsplash | Alt |
|---|---|---|
| "Não sabe o que lançar?" | `photo-1414235077428-338989a2e8c0` (cozinheiro pensativo) | Chef pensando no cardápio |
| "Lança e não vende?" | `photo-1555396273-367ea4eb4db5` (prato na mesa vazio) | Prato não vendido |
| "Perde clientes?" | `photo-1517248135467-4c7edcad34c4` (restaurante cheio) | Restaurante cheio |

Foto vai em altura fixa `h-40`, `object-cover`, `rounded-xl mb-4`.

### 3. Seção "Demo" — emojis viram fotos dos estabelecimentos

Os cards de demonstração (Burguer da Hora e Pizza Feliz) perdem o emoji e ganham uma foto de hambúrguer / pizza do Unsplash como capa visual, mais profissional.

### 4. CTA Final — remove os emojis decorativos flutuantes

Os 4 emojis posicionados absolutamente (🍔 🍕 🌮 🍟) são removidos. No lugar, pode-se colocar uma textura sutil ou simplesmente deixar limpo — o copy forte já basta.

### 5. Seção "Como Funciona" — ícones ok, sem emojis

Os steps já usam ícones Lucide (ChefHat, Heart, BarChart3) — ficam como estão. Nenhum emoji aqui.

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `src/pages/Index.tsx` | Remover emojis flutuantes, adicionar foto de fundo hero, trocar emojis dos cards por fotos Unsplash |

## Resultado Esperado

Uma landing page com cara de produto real:
- Hero com **foto de fundo** apetitosa e overlay escuro-vermelho elegante
- Cards de problema com **fotos reais** de situações de restaurante
- Cards de demo com **fotos de pratos** ao invés de emojis
- CTA final limpo, sem decoração infantil
- Zero emojis decorativos em qualquer lugar da página

