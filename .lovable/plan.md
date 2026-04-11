

## Substituir emoji básico por ilustração animada no IFoodTab

### Problema
O emoji 🛵 é genérico e passa impressão de "feito às pressas". Precisa de algo mais profissional e visualmente atraente.

### Solução
Substituir o emoji por uma ilustração SVG inline animada com CSS — um ícone de moto/delivery estilizado com animações suaves (flutuação, pulso, e partículas de movimento). Tudo feito com SVG + CSS animations, sem dependências externas.

### Implementação

**`src/components/dashboard/IFoodTab.tsx`**:
- Remover o `<div className="text-5xl">🛵</div>`
- Criar um SVG inline com:
  - Ícone de moto/delivery estilizado (ou um ícone de sacola + foguete representando lançamento)
  - Animação de flutuação (float up/down suave)
  - Linhas de movimento animadas ao redor
  - Gradiente com as cores do iFood (vermelho `#EA1D2C`)
- Adicionar um badge animado "Em Breve" com pulse sutil
- Visual geral mais premium: gradiente de fundo no card, tipografia melhorada

### Resultado
Tela "Em Breve" com aparência profissional e polida, sem parecer placeholder genérico.

