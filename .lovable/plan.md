

## Chat de Suporte - Balao Flutuante Global

### Resumo
Criar um widget de chat flutuante (balao no canto inferior direito) que aparece em **todas as paginas** do site. Ele usa IA para responder duvidas sobre o TrendFood, sem sair do assunto.

### Componentes

**1. Nova Edge Function: `support-chat`**
- Copia a estrutura da `sales-chat` existente, mas com um system prompt diferente focado em **suporte/duvidas** (nao vendas)
- O prompt vai conter tudo sobre o TrendFood: planos, funcionalidades, como usar, como cadastrar, delivery, PIX, impressora, cupons, caixa, mesas, cozinha, garcom, etc.
- Regra: nunca responder sobre assuntos fora do TrendFood
- Streaming de respostas pra experiencia fluida

**2. Novo Componente: `src/components/SupportChatWidget.tsx`**
- Balao flutuante fixo no canto inferior direito (icone de chat)
- Ao clicar, abre um painel de chat compacto (tipo popup)
- Campo de input + historico de mensagens na mesma janela
- Mensagens do usuario e do bot com estilos diferentes
- Mensagem de boas-vindas automatica
- Botao de fechar pra minimizar
- Responsivo: funciona bem em mobile e desktop
- Nao requer login (publico pra todos)
- Historico mantido apenas na sessao (state local, sem banco)

**3. Integracao Global: `src/App.tsx`**
- Adicionar o `SupportChatWidget` dentro do `AppInner`, fora das rotas, pra aparecer em todas as paginas
- Nao aparece na plataforma nativa (Capacitor) pra nao atrapalhar o app mobile

### Detalhes Tecnicos

- **Edge Function** usa o Lovable AI gateway (modelo `google/gemini-2.5-flash` pra ser rapido e economico)
- **Streaming** via SSE pra respostas aparecerem em tempo real
- **Z-index alto** no widget pra ficar acima de tudo
- **Animacao** de entrada/saida suave no painel
- **Sem dependencia de auth** - qualquer visitante pode usar
- **Sem persistencia em banco** - conversa vive apenas no state do React

### Layout do Widget

```text
+---------------------------+
|  TrendFood Suporte    [X] |
+---------------------------+
|                           |
|  Bot: Ola! Sou o          |
|  assistente do TrendFood. |
|  Como posso te ajudar?    |
|                           |
|         Voce: Quanto      |
|         custa o plano?    |
|                           |
|  Bot: O plano Pro custa   |
|  R$99/mes...              |
|                           |
+---------------------------+
| [Digite sua duvida...] [>]|
+---------------------------+
```

### Arquivos envolvidos
- **Criar**: `supabase/functions/support-chat/index.ts`
- **Criar**: `src/components/SupportChatWidget.tsx`
- **Editar**: `src/App.tsx` (adicionar o widget)
