
## Plano — Corrigir o badge que está sobrepondo as abas no AuthPage

### Problema real
O elemento “Você está entrando em TrendFood” não está apenas com pouco espaço: ele está **sobreposto** nas abas “Entrar / Criar conta”.  
Isso acontece porque o header desktop está em `absolute`, então ele não reserva altura no layout. Quando o conteúdo do formulário sobe, o badge fica “grudado” por cima da interface.

### O que será ajustado

**1. Tirar o header desktop do `absolute`**
- Remover `absolute top-8 left-12 right-12`
- Colocar o bloco do logo + badge em fluxo normal no painel esquerdo
- Assim o layout passa a reservar espaço real para ele

**2. Separar o topo do conteúdo**
- Criar uma estrutura com:
  - header no topo
  - conteúdo do auth abaixo
- Adicionar `mb`/`pb` consistente entre header e tabs/form para nunca encostar visualmente

**3. Centralizar o formulário sem invadir o header**
- Manter o card/form centralizado, mas dentro de uma área própria (`flex-1`)
- Evitar que a centralização vertical empurre tabs para trás do badge

**4. Refinar o badge para desktop menor**
- Reduzir levemente largura visual do badge
- Se necessário, encurtar a frase em breakpoints intermediários para algo como:
  - `Entrando em TrendFood`
- Manter a versão completa em telas maiores

**5. Preservar o visual atual**
- Não mexer na lógica de auth
- Não mexer no painel direito cinematográfico
- Não alterar mobile, exceto se for necessário manter consistência de espaçamento

### Resultado esperado
- O badge fica acima, com respiro correto
- As abas “Entrar / Criar conta” não ficam mais por baixo dele
- O topo da página passa a ter hierarquia clara: logo/badge primeiro, formulário depois
- Visual mais limpo e profissional

### Arquivo
- `src/pages/AuthPage.tsx`
