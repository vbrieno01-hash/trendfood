

# Configuracao de taxa do motoboy por loja

## Resumo
Adicionar campos de configuracao no painel de Motoboys do dashboard para que o dono da loja personalize a **taxa base** e o **valor por km** do motoboy. Atualmente esses valores sao fixos no codigo (R$ 3,00 base + R$ 2,50/km). Com essa mudanca, cada loja tera seus proprios valores.

## O que muda para o usuario

No painel "Motoboys & Entregas" do dashboard, aparecera uma secao de configuracao com dois campos:
- **Taxa base** (padrao R$ 3,00) - valor fixo pago ao motoboy por corrida
- **Valor por km** (padrao R$ 2,50) - valor adicional por quilometro rodado

O dono salva e todas as proximas entregas usam esses valores.

## Detalhes tecnicos

### 1. Migracao no banco de dados
Adicionar coluna `courier_config` (jsonb) na tabela `organizations` com valor padrao:
```text
{"base_fee": 3.0, "per_km": 2.5}
```

### 2. Arquivo: `src/hooks/useDeliveryDistance.ts`
- Exportar interface `CourierConfig` com campos `base_fee` e `per_km`
- Exportar constante `DEFAULT_COURIER_CONFIG`
- Alterar `calculateCourierFee` para aceitar um segundo parametro opcional `config?: CourierConfig`
- Usar os valores do config ao inves das constantes fixas

### 3. Arquivo: `src/hooks/useCreateDelivery.ts`
- Alterar `createDeliveryForOrder` para receber `courierConfig` opcional
- Passar o config para `calculateCourierFee` ao calcular o fee da entrega

### 4. Arquivo: `src/components/dashboard/CourierDashboardTab.tsx`
- Adicionar secao de configuracao com dois inputs `CurrencyInput` (taxa base e valor/km)
- Buscar e salvar o `courier_config` da organizacao via mutation no Supabase
- Receber `orgId` (ja recebe) para fazer o update

### 5. Arquivos que chamam `createDeliveryForOrder`
- `src/components/dashboard/KitchenTab.tsx` e `src/pages/KitchenPage.tsx`: passar o `courier_config` da organizacao para que o calculo use os valores personalizados

### 6. Arquivo: `src/hooks/useOrganization.ts`
- Adicionar `courier_config` na interface `Organization` e no select da query

### Fluxo
1. Dono da loja abre aba "Motoboys" no dashboard
2. Ve os campos "Taxa base" e "Valor por km" com os valores atuais
3. Edita os valores e clica "Salvar"
4. Proximas entregas criadas pela cozinha usam os novos valores para calcular o fee do motoboy
