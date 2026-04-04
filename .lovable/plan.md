

## Plano: Upgrade completo do prompt de vendas com SPIN Selling + Dores Invisíveis + Fechamento Irresistível

### O que muda
Reescrever o `SYSTEM_PROMPT` em `supabase/functions/sales-chat/index.ts` adicionando 3 novos módulos poderosos, mantendo tudo que já funciona.

### Novos módulos

**1. MAPEAMENTO DE DORES INVISÍVEIS (antes do diagnóstico)**
O Lucas vai automaticamente mapear dores que o dono de restaurante NEM SABE que tem:
- Perda de clientes por demora no WhatsApp (cliente manda mensagem, ninguém responde, vai pro concorrente)
- Erro de pedido manual (anotou errado, cliente reclama, perde fidelidade)
- Falta de controle financeiro (não sabe quanto vendeu, quanto lucrou, quanto perdeu)
- Dependência do iFood (30% de taxa comendo o lucro)
- Tempo desperdiçado (horas respondendo WhatsApp em vez de cuidar da cozinha)
- Falta de recorrência (cliente compra uma vez e nunca mais volta)

**2. MÉTODO SPIN (Situação → Problema → Implicação → Necessidade)**
Estrutura de perguntas que o Lucas vai usar naturalmente na conversa:

| Fase | Exemplo de pergunta |
|---|---|
| **S**ituação | "Hoje você recebe pedido como? WhatsApp, iFood?" |
| **P**roblema | "E quando lotam os pedidos, você consegue dar conta de tudo sem erro?" |
| **I**mplicação | "Quando erra um pedido, o cliente volta ou vai pro concorrente?" |
| **N**ecessidade | "Se tivesse um sistema que elimina erro e o cliente pede sozinho, quanto tempo você economizaria por dia?" |

A Implicação é a chave -- faz o cliente sentir o PESO do problema. A Necessidade faz ele verbalizar a solução.

**3. FECHAMENTO IRRESISTÍVEL (após reversão de objeções)**
Arsenal de 5 técnicas de fechamento:
- **Fechamento por Escassez**: "Essa condição especial é só pra essa semana"
- **Fechamento Condicional**: "Se eu conseguir X, a gente fecha hoje?"
- **Fechamento por Resumo**: Listar todas as dores que o cliente verbalizou + como o TrendFood resolve cada uma
- **Fechamento Dupla Opção**: "Você prefere começar com o plano Grátis pra testar ou já quer o Pro com trial de 7 dias?"
- **Fechamento por Compromisso**: "Você me disse que perde R$300/mês no iFood e 2h/dia no WhatsApp. Se eu te mostrar que resolve isso por R$99/mês, faz sentido começar?"

### Implementação
- 1 arquivo editado: `supabase/functions/sales-chat/index.ts`
- O SYSTEM_PROMPT será reestruturado com os 3 módulos integrados ao fluxo existente
- Deploy automático da edge function
- Zero mudanças no frontend ou banco de dados

### Estrutura final do prompt
1. Identidade (Lucas, WhatsApp, regras)
2. Personalidade (tom, linguagem)
3. **MAPEAMENTO DE DORES INVISÍVEIS** (novo)
4. Fluxo: Conexão → **SPIN Diagnóstico** (novo) → Apresentação → Reversão → Auto-objeção → **FECHAMENTO IRRESISTÍVEL** (novo)
5. Regras (anti-spam, concorrentes, recuo, produto)

