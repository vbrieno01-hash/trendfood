# Roteiro de Homologação iFood — TrendFood

Tudo que já implementamos (Pacote 1 + 2ª via entregador) está pronto. Abaixo está exatamente **o que gravar, como gravar e o que falar**.

---

## 1. Como gravar (setup técnico)

**Ferramenta sugerida:** Loom, OBS Studio ou a gravação nativa do Windows (Win+G) / Mac (Cmd+Shift+5).

**Configuração:**
- Resolução: 1920×1080 (Full HD)
- Áudio: microfone do headset/notebook, ambiente silencioso
- Mostrar **mouse + clique destacado** (Loom já faz; no OBS ative "Click highlight")
- Duração-alvo: **5 a 8 minutos** (analista iFood não assiste vídeo longo)
- Formato final: **MP4**
- Subir no Google Drive / YouTube **não-listado** e mandar o link para o analista

**Abas/janelas a deixar abertas antes de começar** (para não perder tempo navegando):
1. Painel TrendFood logado → aba **Produção (KDS)**
2. Painel TrendFood → aba **Integração iFood** (mostra eventos)
3. Painel TrendFood → aba **Configurações → Impressora** (mostra toggle 2ª via)
4. **Portal do Lojista iFood** (homologação) em outra aba
5. App **iFood Gestor de Pedidos** no celular OU portal homologação para criar o pedido teste

---

## 2. O que gravar (sequência de cenas)

### Cena 1 — Apresentação (30s)
Tela: home do TrendFood logado.
**Fale:**
> "Olá, sou Breno Jackson, responsável técnico do TrendFood, CNPJ 66.067.207/0001-91. Este vídeo demonstra a homologação da integração com a Order API v1 e Merchant API do iFood. Vou criar um pedido de teste, mostrar a recepção, confirmação, mudança de status e cancelamento."

### Cena 2 — Criar pedido teste no iFood (45s)
Tela: Portal do Lojista iFood (homologação) ou app Gestor de Pedidos.
- Crie um pedido marcado como **TESTE** (`isTest: true`)
- Inclua: 1 item com observação, 1 adicional, pagamento online (prepaid)

**Fale:**
> "Estou criando um pedido de teste no merchant homologado, com um item, um adicional e pagamento online."

### Cena 3 — Recepção no KDS (1min)
Tela: TrendFood → aba **Produção (KDS)** + abrir a aba **Integração iFood** lado a lado se possível.
- Aguarde o card aparecer (até 60s pelo polling)
- Mostre o card iFood com o chip vermelho
- Abra o card e mostre: cliente, endereço, itens, **marcação TESTE:SIM**, código de coleta, AUT, taxas

**Fale:**
> "O evento PLC chega via polling a cada 60 segundos. O pedido aparece no KDS com o selo TESTE, código de coleta, taxas do iFood separadas da receita do lojista, e o código de autorização para a nota fiscal."

### Cena 4 — Confirmação (30s)
- Clique em **Aceitar** no KDS
- Vá na aba **Integração iFood** e mostre o `event.id` único e a latência de confirmação

**Fale:**
> "Ao clicar em Aceitar, chamamos POST /orders/{id}/confirm. A latência é registrada em milissegundos. Cada evento tem ID único, garantindo deduplicação."

### Cena 5 — Mudança de status sem loop (45s)
- Vá no **Portal iFood** e mude o status (ex.: marque como Pronto)
- Volte para o TrendFood e mostre o KDS refletindo
- Fale do anti-loop

**Fale:**
> "Quando o lojista muda o status pelo Portal iFood, o TrendFood reflete a mudança sem disparar de volta para o iFood. A flag `ifood_synced_externally` impede o loop."

### Cena 6 — 2ª via do entregador (sem CPF) (1min)
Tela: TrendFood → **Configurações → Impressora**.
- Mostre o toggle **"2ª via sem CPF (entregador)"** — ative
- Volte ao pedido iFood no KDS
- Imprima — mostre que sai 1 comanda completa + 1 comanda **sem CPF**, **sem CNPJ intermediador**, **sem código de autorização**, e com o cabeçalho **VIA DO ENTREGADOR**

**Fale:**
> "Para proteger dados sensíveis do cliente (LGPD), o lojista pode ativar uma 2ª via opcional para o entregador. Essa via remove CPF, CNPJ do intermediador e dados fiscais, mantendo só nome, telefone, endereço e itens. A comanda padrão e os pedidos do nosso PDV não são afetados."

### Cena 7 — Cancelamento com motivos da API (45s)
- Crie outro pedido teste
- No KDS clique em **Cancelar**
- Mostre o modal listando motivos vindos de `GET /orders/{id}/cancellationReasons`
- Escolha um motivo e confirme
- Mostre que o status virou **cancelled**

**Fale:**
> "Os motivos de cancelamento são sempre buscados em tempo real pela API iFood — nunca usamos códigos hardcoded. O lojista escolhe e enviamos o cancellationCode real."

### Cena 8 — Merchant API (45s)
Tela: Painel **admin → aba iFood Merchant API**.
- Selecione a loja → clique **Rodar checklist**
- Mostre os 8 endpoints (GET merchants, status, opening-hours, interruptions etc.) com ✅
- Clique em **+ Pausa 30min** e mostre POST + GET + DELETE

**Fale:**
> "Implementamos também a Merchant API: listagem de lojas, status, horários, e gestão de pausas. Mudanças de horário ou pausa no TrendFood são sincronizadas automaticamente para o iFood via trigger no banco."

### Cena 9 — Encerramento (15s)
**Fale:**
> "Integração validada nos requisitos de Order API e Merchant API. Documentação técnica completa está em trendfood.site/docs/IFOOD-HOMOLOGACAO.md. Obrigado."

---

## 3. Checklist antes de gravar

- [ ] Está logado com a loja **homologada** (com `ifood_credentials` válidas)
- [ ] Toggle **2ª via entregador** começa **desligado** (vai ativar no vídeo)
- [ ] Impressora térmica conectada OU usar modo "Navegador" para visualizar o PDF
- [ ] Limpar pedidos antigos da Produção pra não poluir a tela
- [ ] Testar 1 vez sem gravar pra cronometrar
- [ ] Microfone testado, sem eco

---

## 4. O que enviar junto com o vídeo

No e-mail para o analista iFood:

```
Assunto: Homologação TrendFood — CNPJ 66.067.207/0001-91

Olá,

Segue homologação da integração TrendFood com Order API v1 + Merchant API:

• Vídeo demonstrativo: [link Drive/YouTube não-listado]
• Documentação técnica: https://trendfood.site/docs/IFOOD-HOMOLOGACAO.md
• PDF da documentação: https://trendfood.site/docs/ifood-homologacao-trendfood.pdf
• Merchant ID de teste: [preencher]
• Contato técnico: suporte@trendfood.site

Pontos demonstrados:
1. Recepção via polling (60s) com dedup por event.id
2. Confirmação POST /orders/{id}/confirm dentro do SLA
3. Sincronização bidirecional sem loop (ifood_synced_externally)
4. Cancelamento com motivos buscados em /cancellationReasons
5. Marcação isTest, código de coleta, AUT, CNPJ intermediador e taxas iFood
6. 2ª via opcional do entregador (LGPD)
7. Merchant API completa (8 endpoints + sync de pausas/horários)

Aguardo retorno.
```

---

## 5. Erros comuns a evitar durante a gravação

- **Não** mostre tela com dados de outras lojas (use só a homologação)
- **Não** mude o status manualmente pelo banco — sempre pela UI ou Portal iFood
- **Não** corte cenas com edição agressiva — analista quer ver o fluxo real e contínuo
- Se algo der errado durante a gravação (pedido demora, internet caiu), **regrave aquela cena** em vez de explicar o erro
- Mantenha o tom **objetivo e técnico** — sem música, sem efeitos

---

Pronto pra gravar. Quer que eu gere também um **PDF imprimível** com esse roteiro pra você seguir durante a gravação?
