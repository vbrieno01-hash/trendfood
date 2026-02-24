

## Simular lead resistente: "nem me venha com proposta"

### Objetivo
Testar se a IA recua de forma natural quando o lead manda o cardápio digital dele e já avisa que não quer proposta, sem ser agressiva nem insistente.

### Fluxo da simulação

Vou simular uma conversa de ~8 mensagens no endpoint `/sales-chat` com este cenário:

1. **Lucas**: saudação inicial
2. **Lead**: responde normalmente
3. **Lucas**: papo leve
4. **Lead**: manda o link do cardápio + "nem me venha com proposta, já uso sistema e to satisfeito"
5. **Lucas**: deve reagir respeitando a Regra 9 (elogiar) MAS sem empurrar produto, já que o lead pediu pra não receber proposta
6. **Lead**: reforça "sério, não preciso de nada"
7. **Lucas**: deve recuar de forma natural, sem encerrar a conversa (Regra 5) mas sem insistir na venda
8. **Lead**: "beleza então" — ver se a IA mantém o papo sem forçar

### O que estou verificando

- A IA **não empurra link** quando o lead explicitamente recusa
- A IA **não fica na defensiva** nem se desculpa demais
- A IA **recua mas mantém a porta aberta** sem encerrar
- A IA **não usa kkk** desnecessariamente (Regra 7 atualizada)
- A IA **respeita a Regra 9** — elogia o sistema atual sem criticar

### Execução
Serão 4-5 chamadas sequenciais ao endpoint `POST /sales-chat` construindo o histórico de mensagens a cada turno.

