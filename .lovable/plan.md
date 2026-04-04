

## Plano: Atualizar prompt do robô de vendas (sales-chat)

### Mudança
Substituir o `SYSTEM_PROMPT` atual no arquivo `supabase/functions/sales-chat/index.ts` pelo novo prompt de "Vendas Consultivas de Alta Performance" fornecido.

### O que muda
- O robô deixa de ser o "Lucas vendedor informal de WhatsApp" e passa a ser um "Especialista em Vendas Consultivas"
- Tom muda de gírias/abreviações para amigável e profissional
- Fluxo passa a seguir: Conexão → Diagnóstico → Apresentação da Solução → Validação → Fechamento → Recomendação
- Novas técnicas: fechamento condicional para desconto, agendamento quando quer "pensar", pedido de indicação pós-venda

### Detalhes técnicos
- 1 arquivo editado: `supabase/functions/sales-chat/index.ts` (apenas o conteúdo da constante `SYSTEM_PROMPT`)
- Deploy automático da edge function após edição
- Zero mudanças no frontend ou banco de dados

### Observação importante
O novo prompt é **genérico** (não menciona TrendFood, preços, planos, link, nem funcionalidades específicas). O prompt atual contém todas essas informações contextuais. Vou **mesclar** o novo estilo/fluxo com as informações do TrendFood (planos, preços, link, regras anti-spam, regras de concorrentes, etc.) para que o robô continue sabendo vender o produto correto.

