

## Expandir informações do produto na Regra 11 e seção "SOBRE O TRENDFOOD"

### O que muda

Atualizar o `SYSTEM_PROMPT` nos dois arquivos para que o Lucas tenha mais conhecimento sobre o TrendFood e consiga explicar melhor quando o lead perguntar.

### Arquivos afetados
- `supabase/functions/sales-chat/index.ts`
- `supabase/functions/whatsapp-webhook/index.ts`

### Mudanças específicas

**1. Expandir a lista de informações na Regra 11** (linhas 108-114 no sales-chat):

A lista atual é básica. Vou substituir por uma versão mais completa com as funcionalidades que você listou, mantendo curto e natural:

```
- Use essas informacoes pra explicar (nao precisa falar tudo, so o que fizer sentido no contexto):
  - Sistema de gestao completo pra restaurante, lanchonete, food truck, bar, cafeteria, delivery
  - Funciona no navegador, sem baixar app nenhum
  - Cardapio digital — cliente acessa pelo celular via QR Code na mesa ou link
  - Pedidos em tempo real — cai direto no painel da cozinha (KDS), sem papel
  - Painel do atendente — controle de pedidos ativos e fechamento de conta
  - PIX integrado — cliente paga direto pelo sistema e ja confirma automatico
  - Controle de caixa — abertura/fechamento de turno, sangrias, saldo
  - Relatorios — faturamento, ticket medio, mais vendidos
  - Cupons de desconto — promocoes com valor fixo ou percentual
  - Impressao termica — imprime automatico 80mm com QR Code PIX
  - Zero taxa por pedido, diferente do iFood
  - Plano gratis pra sempre com cardapio + 3 mesas
```

**2. Expandir a seção "SOBRE O TRENDFOOD"** (linhas 116-122):

Adicionar a descrição geral do produto antes dos preços:

```
SOBRE O TRENDFOOD (so mencione quando fizer sentido, NUNCA antes da mensagem 6):
- Sistema completo de gestao e autoatendimento pra food service, tudo online, sem app pra baixar
- Serve pra restaurante, lanchonete, food truck, bar, cafeteria, delivery
- Funciona pelo navegador (SaaS), sem instalar nada
- Funcionalidades: cardapio digital, pedidos tempo real, KDS, PIX, caixa, relatorios, cupons, impressao termica
- Zero taxa por pedido, so assinatura mensal
- Gratis: cardapio digital + 3 mesas + pedidos ilimitados pra sempre
- Pro R$99/mes: mesas ilimitadas, delivery, PIX automatico, impressora, cupons, caixa
- Enterprise R$249/mes: tudo do Pro + multiplas unidades + relatorios
- Trial de 7 dias gratis do Pro
- Link UNICO: https://tinyurl.com/trendfood (esse é o UNICO recurso que voce tem pra mandar)
```

### Importante
- O Lucas não precisa falar TUDO — a instrução diz "nao precisa falar tudo, so o que fizer sentido no contexto"
- Mantém o estilo curto e informal — ele usa essas informações pra responder naturalmente, não pra listar features
- Deploy automático após edição

