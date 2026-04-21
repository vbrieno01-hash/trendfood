

## Plano — Adicionar divisão e refinar contraste no AuthPage

### O problema visual

Comparando sua tela com a Grok:
- **Grok**: painel esquerdo cinza-escuro uniforme + linha de divisão clara + painel direito quase preto com feixe de luz dramático atrás da logo
- **TrendFood atual**: os dois painéis se misturam (gradiente contínuo), sem fronteira visível, e o glow tá disperso demais

### Correções no `src/pages/AuthPage.tsx`

**1. Painel esquerdo — fundo mais sólido e uniforme**
- Trocar o gradiente radial atual por um fundo **mais uniforme**: `hsl(20 25% 9%)` (marrom-escuro quase plano)
- Manter o noise sutil pra textura
- Resultado: lado do form fica visualmente "calmo", deixa a logo brilhar do outro lado

**2. Divisória central visível**
- Adicionar uma **linha vertical fina** entre os dois painéis (só desktop):
  - `border-l border-white/[0.08]` no painel direito, OU
  - Um `<div>` absoluto com gradiente vertical: `bg-gradient-to-b from-transparent via-white/10 to-transparent` (linha que esmaece nas pontas, estilo cinematográfico)
- Largura 1px, posicionada no encontro dos painéis
- Cria a sensação clara de "duas cenas separadas"

**3. Painel direito — mais escuro + feixe de luz dramático**
- Fundo base: `hsl(20 40% 6%)` (quase preto com tinta quente, bem mais escuro que o esquerdo)
- **Feixe de luz direcional** (em vez de glow circular disperso):
  - Gradiente cônico/elíptico vindo do **canto superior direito** descendo na diagonal
  - Cores: `hsl(20 100% 50% / 0.4)` no foco → transparente
  - Simula a "luz vazando" da Grok, mas em laranja-dourado
- Logo posicionada **levemente à esquerda do centro** do painel direito, pra o feixe de luz vir "por trás" dela criando profundidade
- Drop-shadow mais forte na logo: `drop-shadow-[0_0_120px_hsl(20_100%_50%_/_0.6)]`

**4. Tagline "Zero taxas. 100% seu."**
- Mover pra mais perto da logo (não tão embaixo)
- Adicionar leve animação de fade-in delay
- Manter discreta, branco translúcido

### Resultado esperado

- **Divisão clara** entre form (esquerda calma) e showcase (direita dramática)
- Logo TrendFood com **feixe de luz quente** vindo da diagonal, igual o efeito da Grok mas em laranja
- Sensação de "duas cenas" coerentes mas separadas, não um borrão contínuo
- Mantém 100% da lógica (auth, Google OAuth, refParam, etc.)

### Arquivo
- `src/pages/AuthPage.tsx` (apenas ajustes visuais no JSX/styles)

