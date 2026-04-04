

## Plano: Adicionar 3 técnicas avançadas de auto-objeção no prompt de vendas

### O que muda
Adicionar um novo módulo **"TÉCNICAS AVANÇADAS DE AUTO-OBJEÇÃO"** na seção de reversão de objeções (após linha 68) do `SYSTEM_PROMPT` em `supabase/functions/sales-chat/index.ts`.

### 3 técnicas que serão adicionadas

1. **"E se...?" (Cenário Hipotético)** -- Quando o cliente diz "tá caro", devolver: "Entendo. Se deixarmos o investimento de lado por um segundo, você sente que essa é a solução ideal pro que você me contou antes?" Se ele disser "sim", ele admitiu que o produto tem valor e o único problema é preço (resolvido com fechamento condicional).

2. **Reversão de Valor (Custo de não comprar)** -- Fazer o cliente listar os prejuízos de continuar sem solução: "Na sua visão, quanto está custando pra você continuar anotando pedido errado, perdendo cliente no WhatsApp por mais 6 meses?" O cliente se auto-convence que não comprar sai mais caro.

3. **Isolamento da Objeção** -- Garantir que não está inventando desculpas: "Além do valor, existe algum outro motivo que te impediria de começar hoje?" Se disser "não, só o valor", fechou a porta para outras desculpas.

### Implementação
- 1 arquivo editado: `supabase/functions/sales-chat/index.ts`
- Inserir o módulo entre as "REGRAS DA REVERSÃO" (linha 68) e o "FECHAMENTO E NEGOCIAÇÃO" (linha 70)
- Deploy automático da edge function
- Zero mudanças no frontend ou banco de dados

