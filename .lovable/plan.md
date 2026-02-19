
# Configuração Global de Frete da Plataforma

## O problema

Hoje cada loja tem sua própria `delivery_config` salva individualmente no banco. Isso significa:
- Para alterar R$5 → R$7 no frete, teria que atualizar cada loja uma a uma
- Novas lojas sem `store_address` configurado mostram "A combinar" porque o cálculo de distância não consegue rodar
- Não existe um painel centralizado de administração da plataforma

## A solução

Criar uma tabela de configuração global (`platform_config`) com uma única linha que guarda as taxas de frete. Todos os cálculos de frete passam a ler desta tabela global. O `delivery_config` por organização é ignorado. Quando o admin da plataforma muda as taxas, **todas as lojas refletem automaticamente**.

Além disso, criar uma tela de **Painel Admin** protegida por e-mail (só você acessa), acessível via rota `/admin`.

## Arquitetura

```text
ANTES (atual):
  Loja A → delivery_config: {fee_tier1: 5, ...}  ← independente
  Loja B → delivery_config: {fee_tier1: 5, ...}  ← independente
  Loja C → delivery_config: {fee_tier1: 5, ...}  ← independente

DEPOIS (novo):
  platform_config (tabela única) → {fee_tier1: 5, ...}  ← uma só fonte
  Loja A → usa platform_config
  Loja B → usa platform_config
  Loja C → usa platform_config
```

## Mudanças técnicas

### 1. Nova tabela `platform_config` (migração SQL)

```sql
CREATE TABLE public.platform_config (
  id           text PRIMARY KEY DEFAULT 'singleton',
  delivery_config jsonb NOT NULL DEFAULT 
    '{"fee_tier1":5,"fee_tier2":8,"fee_tier3":12,"tier1_km":2,"tier2_km":5,"free_above":100}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Inserir linha única com os valores atuais
INSERT INTO public.platform_config (id) VALUES ('singleton');

-- RLS: qualquer um pode LER (para o cálculo de frete funcionar na loja pública)
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_config_select_public"
  ON public.platform_config FOR SELECT USING (true);

-- Apenas usuários autenticados podem ATUALIZAR (o painel admin exige login)
CREATE POLICY "platform_config_update_authed"
  ON public.platform_config FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

### 2. Novo hook `usePlatformDeliveryConfig.ts`

Lê a configuração global da tabela `platform_config`. Usado pelo `useDeliveryFee` e pelo painel admin.

```typescript
export function usePlatformDeliveryConfig() {
  return useQuery({
    queryKey: ["platform_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_config")
        .select("delivery_config")
        .eq("id", "singleton")
        .single();
      if (error) throw error;
      return (data?.delivery_config ?? DEFAULT_DELIVERY_CONFIG) as DeliveryConfig;
    },
    staleTime: 5 * 60 * 1000, // cache 5 min
  });
}
```

### 3. Atualizar `useDeliveryFee.ts`

Adicionar parâmetro `globalConfig` (lido de `platform_config`) no lugar de ler de `org.delivery_config`.

```typescript
export function useDeliveryFee(
  customerAddress: string,
  subtotal: number,
  org: Organization | null | undefined,
  enabled: boolean,
  globalConfig?: DeliveryConfig   // ← novo parâmetro
): UseDeliveryFeeResult {
  // usa globalConfig se disponível, senão DEFAULT
  const config = globalConfig ?? DEFAULT_DELIVERY_CONFIG;
  // ...
}
```

### 4. Atualizar `UnitPage.tsx`

Chamar `usePlatformDeliveryConfig()` e passar o resultado para `useDeliveryFee`.

```typescript
const { data: globalDeliveryConfig } = usePlatformDeliveryConfig();

const { fee: deliveryFee, ... } = useDeliveryFee(
  fullCustomerAddress,
  _totalPriceForFee,
  org ?? null,
  !!org && orderType === "Entrega" && checkoutOpen,
  globalDeliveryConfig   // ← passando config global
);
```

### 5. Nova rota `/admin` — `src/pages/AdminPage.tsx`

Página de administração da plataforma protegida por e-mail. Só usuários cujo e-mail está na lista de admins vão conseguir ver o conteúdo. Exibe:
- Tabela editável de taxas de frete (faixa 1, faixa 2, faixa 3, frete grátis acima de)
- Lista de todas as lojas cadastradas (nome, slug, status de endereço configurado ou não)
- Botão Salvar que grava na `platform_config`

```typescript
const ADMIN_EMAILS = ["seu-email@aqui.com"]; // configurável

export default function AdminPage() {
  const { user } = useAuth();
  if (!ADMIN_EMAILS.includes(user?.email ?? "")) {
    return <Navigate to="/" />;
  }
  // ... painel de admin
}
```

### 6. Atualizar `StoreProfileTab.tsx`

Remover a seção de edição das taxas de frete (Frete até X km, Frete de X a Y km, etc.) — essas configurações agora são globais. Manter apenas o campo de **endereço da loja** (origin do frete, que é específico de cada loja).

No lugar dos campos removidos, exibir um painel informativo:
```
📦 Tabela de frete: configurada globalmente pelo admin da plataforma
   Faixa 1 (até 2 km): R$ 5,00
   Faixa 2 (2–5 km): R$ 8,00
   Faixa 3 (acima de 5 km): R$ 12,00
```

### 7. Adicionar rota `/admin` em `App.tsx`

```typescript
<Route path="/admin" element={<AdminPage />} />
```

## Fluxo completo após a mudança

```text
Admin acessa /admin → edita taxas → salva em platform_config
    ↓
Loja A abre checkout → useDeliveryFee lê platform_config → calcula frete ✓
Loja B abre checkout → useDeliveryFee lê platform_config → calcula frete ✓
Loja nova abre checkout → useDeliveryFee lê platform_config → calcula frete ✓
```

## O que NÃO muda

- O `store_address` continua sendo por loja (cada loja tem sua própria origem de frete)
- Lojas sem `store_address` ainda mostram "A loja não configurou endereço"
- O campo `delivery_config` continua na tabela `organizations` mas passa a ser ignorado (não é deletado para não quebrar dados existentes)

## Arquivos modificados

| Arquivo | Ação |
|---|---|
| banco de dados | criar `platform_config` via migração |
| `src/hooks/usePlatformDeliveryConfig.ts` | criar (novo hook) |
| `src/hooks/useDeliveryFee.ts` | aceitar `globalConfig` como parâmetro |
| `src/pages/UnitPage.tsx` | usar `usePlatformDeliveryConfig` + passar para `useDeliveryFee` |
| `src/pages/AdminPage.tsx` | criar (nova página de admin) |
| `src/components/dashboard/StoreProfileTab.tsx` | remover campos de edição de taxa, mostrar leitura da config global |
| `src/App.tsx` | adicionar rota `/admin` |
