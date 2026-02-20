

# Melhorias para Facilitar a Vida dos Lojistas

Analisei todo o painel e identifiquei 5 melhorias de alto impacto para o dia a dia dos donos de loja. Escolha as que fazem mais sentido para o seu negocio.

---

## 1. Notificacoes Push de Novos Pedidos

**Problema**: Hoje o lojista precisa ficar olhando a tela do KDS para saber se chegou pedido novo. O som so toca se a aba estiver aberta.

**Solucao**: Usar a API de Web Push Notifications do navegador para enviar alertas mesmo quando o app esta minimizado. Com o PWA ja configurado, basta adicionar um Service Worker listener e pedir permissao ao usuario.

**Impacto**: O lojista pode fazer outras coisas e ser notificado no celular/computador quando chega pedido.

---

## 2. Relatorio Diario Automatico no WhatsApp

**Problema**: O lojista nao tem um resumo rapido de como foi o dia sem abrir o painel.

**Solucao**: Criar uma edge function agendada (cron) que roda todo dia as 23h, calcula o resumo do dia (total de pedidos, faturamento, ticket medio, itens mais vendidos) e envia uma mensagem formatada para o WhatsApp do lojista.

**Impacto**: Visao rapida do desempenho sem precisar acessar o sistema.

---

## 3. Pausar Loja Temporariamente (Modo Ferias/Pausa)

**Problema**: Se o lojista precisa fechar por algumas horas ou dias (ferias, falta de insumo, emergencia), nao existe um botao simples para pausar os pedidos. Os clientes continuam acessando a pagina e tentando pedir.

**Solucao**: Adicionar um toggle "Pausar Loja" no dashboard Home que salva um campo `paused` na tabela `organizations`. Na pagina publica (`UnitPage`), exibir um aviso "Estamos fechados temporariamente" quando pausado, bloqueando novos pedidos.

**Impacto**: Controle imediato sem precisar mexer em horario de funcionamento.

---

## 4. Duplicar Item do Cardapio

**Problema**: Para criar itens parecidos (ex: X-Burguer, X-Burguer com Bacon), o lojista precisa preencher tudo do zero.

**Solucao**: Adicionar um botao "Duplicar" em cada item do cardapio no `MenuTab`. Ao clicar, cria uma copia com o nome "(Copia) Nome do Item" ja preenchida no formulario de edicao.

**Impacto**: Economia de tempo na gestao do cardapio, especialmente para lojas com muitas variacoes.

---

## 5. Exportar Historico de Pedidos (CSV/Excel)

**Problema**: O lojista nao consegue baixar os dados de pedidos para fazer controle financeiro externo, prestar contas ao contador ou analisar em planilha.

**Solucao**: Adicionar um botao "Exportar" no `HistoryTab` que gera um arquivo CSV com todos os pedidos filtrados (data, mesa, itens, valor total, status de pagamento).

**Impacto**: Facilita a contabilidade e o controle financeiro fora do sistema.

---

## Resumo de Prioridade

| Melhoria | Esforco | Impacto |
|---|---|---|
| Pausar Loja | Baixo | Alto |
| Duplicar Item | Baixo | Medio |
| Exportar CSV | Baixo | Alto |
| Notificacoes Push | Medio | Alto |
| Relatorio WhatsApp | Alto | Medio |

## Proximos Passos

Escolha quais melhorias voce quer implementar primeiro e eu comeco a construir. Recomendo comecar pela **Pausar Loja** e **Exportar CSV** por serem rapidas e de alto impacto.

