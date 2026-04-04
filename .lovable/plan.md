

## Plano: Adicionar templates de mensagens prontas (clientes antigos + abertura)

### O que muda
Adicionar uma seção de **mensagens prontas** no chat de vendas com duas categorias:
1. **Mensagens de Abertura** — para iniciar conversa com leads novos
2. **Mensagens de Reativação** — para reengajar clientes antigos/inativos

### Como funciona
- Quando uma conversa está ativa e sem mensagens (ou via botão), aparece um painel com templates organizados por categoria
- Cada template tem um botão **Copiar** para colar direto no WhatsApp
- Os templates atuais de "sugestões rápidas" (linha 467-479) serão substituídos por este sistema mais completo

### Mensagens de Abertura (exemplos)
- "Olá! Me conta, como está o movimento aí hoje?"
- "E aí, tudo certo? Vi que você trabalha com alimentação, queria trocar uma ideia rápida"
- "Opa! Peguei seu contato numa lista de restaurantes da região. Posso te fazer uma pergunta rápida?"

### Mensagens de Reativação (exemplos)
- "Fala [nome]! Sumiu hein! Como está a operação aí?"
- "E aí [nome], tudo bem? Lembrei de você, como estão as coisas no delivery?"
- "Oi [nome]! Faz um tempo que a gente conversou. Surgiu uma novidade que pode te interessar"
- "Fala [nome]! Vi que você tinha interesse, ainda está precisando de um sistema?"

### Implementação
- 1 arquivo editado: `src/components/admin/SalesChatTab.tsx`
- Templates ficam como constante no código, organizados por categoria
- Botão de copiar em cada template (mesmo estilo do chat)
- Substitui o nome `[nome]` pelo `client_name` da conversa automaticamente
- Sem mudanças no banco de dados

