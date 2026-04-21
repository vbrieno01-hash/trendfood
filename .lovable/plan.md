

## Plano — Substituir o painel direito por uma imagem cinematográfica gerada

### Diagnóstico

O painel direito atual está com **excesso de laranja** (radial gradient + drop-shadow + halo + light leak), tudo sobreposto, fazendo parecer "borrado" e amador. A Grok funciona porque é **uma única imagem cinematográfica esticada** ocupando toda a metade — sem camadas de CSS competindo.

### Solução

Trocar todos os efeitos CSS do painel direito por **uma imagem cinematográfica gerada via AI**, esticada no painel inteiro (estilo wallpaper de produto premium), com a logo TrendFood discretamente posicionada por cima.

### O que vai ser feito

**1. Gerar imagem cinematográfica via AI Gateway (nano banana pro)**
- Prompt: cena cinematográfica vertical, ambiente escuro premium estilo "dark luxury restaurant", iluminação dramática lateral cor âmbar/laranja queimado vindo do canto, partículas suaves no ar, estética minimalista tipo Apple/xAI, sem texto, sem objetos identificáveis — pura atmosfera
- Modelo: `google/gemini-3-pro-image-preview` (qualidade máxima)
- Aspect ratio vertical (~3:4 ou 9:16) pra ocupar metade da tela em desktop
- Salvar em `src/assets/auth-cinematic-bg.png`

**2. Refatorar painel direito do `AuthPage.tsx`**
- Remover **todos** os gradientes, halos, light leaks e drop-shadows atuais
- Usar a nova imagem como `background` do painel direito (`object-cover`, ocupa 100% do espaço)
- Logo TrendFood **menor e mais elegante** (não gigante), centralizada com `drop-shadow` sutil branco/dourado
- Tagline "Zero taxas. 100% seu." abaixo da logo, fonte fina branca
- Overlay escuro sutil por cima da imagem (`bg-black/30`) pra garantir contraste com a logo
- Borda esquerda com gradiente fino pra fundir com painel do form

**3. Manter painel esquerdo intacto**
- Form continua com fundo marrom-escuro uniforme atual (já tá bom)
- Divisória vertical permanece

**4. Mobile**
- Painel direito continua escondido (`hidden lg:flex`)
- Sem mudança no mobile

### Resultado esperado

- Painel direito vira uma **cena cinematográfica real** (não CSS amador), com a logo TrendFood elegantemente posicionada
- Mesma sensação premium da Grok, mas com identidade própria (paleta quente, atmosfera de restaurante luxuoso)
- Zero "borrão laranja" — a imagem dá profundidade real, a logo só se sobrepõe
- 100% da lógica de auth preservada

### Arquivos
- `src/assets/auth-cinematic-bg.png` (nova, gerada via AI)
- `src/pages/AuthPage.tsx` (simplificação do painel direito)

