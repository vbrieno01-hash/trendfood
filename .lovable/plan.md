
# Cálculo de Frete Automático com Geocodificação Gratuita

## Visão geral

Quando o cliente selecionar **Entrega** no checkout e digitar o endereço, o sistema vai:

1. Geocodificar o endereço do cliente com o **Nominatim** (OpenStreetMap, gratuito, sem API key)
2. Calcular a distância em km pela rota real com o **OSRM** (Open Source Routing Machine, gratuito)
3. Aplicar a tabela de frete configurada pelo lojista
4. Exibir o valor do frete automaticamente no resumo antes de o cliente enviar o pedido

Se o subtotal dos itens for maior que R$ 100, o frete é zerado ("Grátis").

Nenhuma API paga é usada. Nenhuma biblioteca pesada é instalada (sem Leaflet — o cálculo de rota não precisa de mapa visual).

---

## Tabela de frete padrão (configurável pelo lojista)

| Distância | Frete |
|-----------|-------|
| Até 2 km | R$ 5,00 |
| 2 km – 5 km | R$ 8,00 |
| Acima de 5 km | R$ 12,00 |
| Pedido acima de R$ 100,00 | Grátis |

O lojista poderá personalizar os valores e o limite de frete grátis direto no painel de controle.

---

## Fluxo de dados

```text
Cliente digita o endereço
        │
        ▼ (debounce 800ms após parar de digitar)
Nominatim API  ──── geocodifica ────►  { lat, lon }  (endereço do cliente)
        │
        ▼
org.store_address  ──── geocodifica ──►  { lat, lon }  (endereço da loja)
        │ (geocodificado uma vez e cacheado na sessão)
        ▼
OSRM API  ──── rota entre os dois pontos ──►  distância em km
        │
        ▼
Tabela de frete  ──►  R$ 5 / R$ 8 / R$ 12 / Grátis
        │
        ▼
Exibe no resumo do pedido
```

---

## O que será adicionado / modificado

### 1. Banco de dados — nova coluna `store_address` e tabela de frete em `organizations`

Duas novas colunas na tabela `organizations`:

- `store_address text` — endereço físico da loja (usado como origem do frete)
- `delivery_config jsonb` — configuração de frete:
  ```json
  {
    "fee_tier1": 5.00,
    "fee_tier2": 8.00,
    "fee_tier3": 12.00,
    "tier1_km": 2,
    "tier2_km": 5,
    "free_above": 100.00
  }
  ```

### 2. Painel do lojista — `StoreProfileTab.tsx`

Nova seção **"Entrega e Frete"** com:
- Campo de texto para o **endereço da loja** (origem do cálculo)
- Três campos numéricos para os **valores de frete por faixa** (R$ por km tier)
- Um campo para o **valor mínimo de frete grátis** (padrão: R$ 100)

### 3. Hook `useDeliveryFee.ts` (novo arquivo)

Hook que encapsula toda a lógica de geocodificação e cálculo:

```typescript
// src/hooks/useDeliveryFee.ts
export function useDeliveryFee(customerAddress: string, org: Organization) {
  // Retorna: { fee, freeShipping, loading, error, distanceKm }
}
```

Internamente:
- Usa debounce de 800ms para não disparar a cada tecla
- Geocodifica o endereço da loja **uma vez** por sessão (cache em `useRef`)
- Geocodifica o endereço do cliente com Nominatim, adicionando a cidade/estado do endereço da loja para melhorar a precisão
- Chama OSRM para distância real de rota entre os dois pontos
- Aplica a tabela de frete

### 4. Checkout — `UnitPage.tsx`

- Integra o hook `useDeliveryFee` passando o `address` atual e o `org`
- Exibe no resumo do carrinho:
  - Subtotal dos itens
  - Linha de frete (com estado: "Calculando...", "Grátis", "R$ X,XX", ou "Endereço não encontrado")
  - **Total geral** = subtotal + frete
- O frete também é incluído na mensagem do WhatsApp e nas notas estruturadas (`FRETE:R$5,00`)

---

## Como ficará o resumo do pedido no checkout

```text
┌─────────────────────────────────────┐
│  2x X-Burguer              R$ 29,80 │
│  1x Batata Frita           R$ 12,00 │
│  1x Coca-Cola               R$ 8,00 │
│ ──────────────────────────────────  │
│  Subtotal                  R$ 49,80 │
│  Frete (1,8 km) 🛵          R$ 5,00 │ ← novo
│ ══════════════════════════════════  │
│  TOTAL                     R$ 54,80 │ ← inclui frete
└─────────────────────────────────────┘
```

Se Retirada selecionada:
```text
│  Frete                        Grátis │
```

---

## Arquivos afetados

| Arquivo | O que muda |
|---|---|
| Migração SQL | Adiciona `store_address text` e `delivery_config jsonb` em `organizations` |
| `src/hooks/useOrganization.ts` | Adiciona `store_address` e `delivery_config` na interface |
| `src/hooks/useDeliveryFee.ts` | Novo hook — toda lógica de geocodificação + OSRM + tabela de frete |
| `src/components/dashboard/StoreProfileTab.tsx` | Nova seção "Entrega e Frete" |
| `src/pages/UnitPage.tsx` | Integra frete no resumo do carrinho e no envio do pedido |

---

## Detalhes técnicos

### Nominatim (geocodificação)
```
GET https://nominatim.openstreetmap.org/search
  ?q=Rua+das+Flores+10+Cubatão+SP
  &format=json&limit=1
```
Retorna `[{ lat, lon }]`. Gratuito, sem API key. Respeita o rate limit de 1 req/s.

### OSRM (distância por rota)
```
GET https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}
  ?overview=false
```
Retorna `routes[0].distance` em metros. Divide por 1000 para km. Gratuito, sem API key.

### Precisão do geocoding
Para melhorar a precisão, o endereço do cliente será complementado com a cidade/estado extraídos do `store_address` da loja — ex: se a loja é em "Cubatão, SP", o endereço "Rua das Flores, 10" vira "Rua das Flores, 10, Cubatão, SP".

### Compatibilidade com pedidos antigos
O campo `FRETE` nas notas estruturadas é opcional — pedidos sem esse campo continuam funcionando normalmente no comprovante.

### Retirada no local
Para pedidos de Retirada, o frete é sempre R$ 0,00 / Grátis, sem chamar nenhuma API.
