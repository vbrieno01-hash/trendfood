

## Plano — Gerar nova logo cinematográfica para o painel direito

### Diagnóstico

A logo atual no painel direito (ícone TrendFood importado de `@/assets/logo-icon.png`) não combina visualmente com o fundo cinematográfico — fica parecendo "colada por cima". Precisa de uma logo nova, gerada no mesmo estilo do fundo, pra integrar de forma natural.

### O que vai ser feito

**1. Gerar logo cinematográfica via AI Gateway**
- Modelo: `google/gemini-3-pro-image-preview` (qualidade máxima)
- Prompt: logo minimalista premium "TrendFood" estilo monograma/símbolo, com tipografia moderna sans-serif, acabamento metálico em laranja-dourado quente brilhando, fundo transparente, estética Apple/xAI, glow sutil ao redor, sem sombra de chão, formato quadrado
- Salvar em `src/assets/auth-logo-cinematic.png`

**2. Atualizar `src/pages/AuthPage.tsx`**
- Trocar import: `logoIcon` → `authLogoCinematic` (nova logo)
- Manter posicionamento atual (centralizada no painel direito)
- Ajustar drop-shadow se necessário pra harmonizar com o brilho próprio da nova logo
- Tamanho mantido (`w-[min(32vh,260px)]`)

**3. Painel esquerdo (form)**
- Manter a logo atual (`logoIcon`) no canto superior — ela funciona bem em tamanho pequeno sobre fundo escuro
- Sem mudanças no form

### Resultado esperado

- Nova logo grande no painel direito, nascendo da própria atmosfera da imagem cinematográfica (não mais "colada")
- Mesma identidade TrendFood, mas em versão premium/editorial
- Integração visual perfeita com o fundo gerado

### Arquivos
- `src/assets/auth-logo-cinematic.png` (nova, gerada via AI)
- `src/pages/AuthPage.tsx` (apenas troca do import e da tag `<img>`)

