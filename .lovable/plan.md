

## Diagnóstico

- `UnitPage.tsx` linha 1268 renderiza fixo `["Entrega", "Retirada"]` — sem condicional.
- Banco (`organizations`) **não tem** coluna pra controlar isso.
- `OperationsTab` / `SettingsTab` no dashboard também não tem essa config.

## Plano

### 1. Banco: adicionar campo de modo de atendimento
Migration nova em `organizations`:
- Coluna `service_modes` JSONB com default `{"delivery": true, "pickup": true}` (ambos ativos por padrão pra não quebrar lojas existentes).

Por que JSONB e não 2 booleans: futuro permite adicionar "consumo no local", "drive-thru" sem nova migration.

### 2. Painel do lojista: toggle em Configurações
Em `src/components/dashboard/SettingsTab.tsx` (ou onde fica o card de Loja/Operação), adicionar uma seção **"Modos de atendimento"** com:
- Switch "Aceita Entrega" 🛵
- Switch "Aceita Retirada no local" 🏃
- Validação: pelo menos UM precisa estar ativo (se desligar o último, mostra toast e impede salvar)
- Salva em `organizations.service_modes`

### 3. Hook `useOrganization.ts`
Adicionar `service_modes` na interface `Organization` e no `select` da query.

### 4. Página do cliente: render condicional
Em `UnitPage.tsx` linhas 1262-1293:
- Ler `org.service_modes`
- Se ambos ativos → mostra os 2 botões (comportamento atual)
- Se só 1 ativo → **pular o seletor inteiro**, setar `orderType` automaticamente no único modo disponível, mostrar um chip discreto tipo "🛵 Apenas entrega" ou "🏃 Apenas retirada" pra deixar claro pro cliente
- Se só Retirada → esconder também os campos de endereço/bairro/frete (já que retirada não usa)
- Se só Entrega → manter endereço como obrigatório

### 5. Onboarding (opcional, leve)
No `OnboardingWizard.tsx` etapa de logística, adicionar pergunta "Você faz entrega, retirada ou ambos?" e gravar em `service_modes`. Lojas novas já saem configuradas direito.

### Arquivos a editar
1. **Migration nova** — `ALTER TABLE organizations ADD COLUMN service_modes JSONB DEFAULT '{"delivery": true, "pickup": true}'::jsonb`
2. `src/hooks/useOrganization.ts` — interface + select
3. `src/components/dashboard/SettingsTab.tsx` — UI dos switches + save
4. `src/pages/UnitPage.tsx` — render condicional do seletor + auto-set + esconder endereço se for só retirada
5. `src/components/dashboard/OnboardingWizard.tsx` — pergunta na etapa de logística

### Resultado esperado

**Lojista que só faz retirada:**
- Vai em Configurações → desliga "Aceita Entrega"
- Cliente abre o cardápio → não vê seleção, sistema já assume "Retirada", esconde endereço, no resumo aparece "🏃 Retirada no local"

**Lojista que só faz entrega:**
- Mesma coisa invertido. Cliente já vai direto pra preencher endereço.

**Lojista padrão (ambos):**
- Tudo continua igual hoje.

**Lista de notas/dúvidas que talvez você queira responder antes de eu codar:**
- Quer também controlar **"Consumo no local"** (mesa)? Hoje isso já é feito por outro caminho (URL `/mesa/X`) então provavelmente não precisa entrar nesse toggle, mas vale confirmar.
- Quer que eu coloque a config dentro da aba **"Configurações"** ou crie uma seção separada em **"Operação"**?

