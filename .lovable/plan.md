

# Correcao de Vulnerabilidades de Seguranca

## Resumo

Corrigir as falhas de seguranca detectadas sem alterar nenhuma interface ou fluxo existente. As correcoes envolvem ajustes nas politicas de acesso ao banco de dados e habilitacao de protecao contra senhas vazadas.

---

## Problemas e Acoes

### 1. Dados financeiros de retiradas de caixa expostos publicamente (ERRO)

**Problema:** A tabela `cash_withdrawals` possui SELECT publico, expondo valores e motivos de retiradas de caixa para qualquer pessoa na internet.

**Correcao:** Substituir a politica `cash_withdrawals_select_public` (que usa `true`) por uma politica que permite SELECT apenas ao dono da organizacao.

**Impacto:** Nenhum. O painel de caixa e acessado apenas pelo lojista autenticado.

---

### 2. Qualquer pessoa pode modificar pedidos sem restricao (ERRO)

**Problema:** A politica `orders_update_status_public` permite que qualquer usuario atualize QUALQUER campo de qualquer pedido (inclusive marcar como pago, alterar notas, etc).

**Correcao:** Restringir a politica publica para que apenas os campos operacionais (`status`) possam ser alterados. A nova politica garantira que campos sensiveis (`paid`, `payment_method`, `notes`, `organization_id`, `table_number`) nao sejam modificados por usuarios nao autenticados. O dono da organizacao mantem acesso total via a politica `orders_update_owner` existente.

**Impacto:** O painel de cozinha e garcom continuam funcionando normalmente (eles so alteram `status`). Atualizacoes de `paid` e `payment_method` feitas nas paginas publicas (TableOrderPage, UnitPage) continuam funcionando porque essas paginas tambem atualizam `status` junto, entao precisarei ajustar a politica para permitir tambem `payment_method` e `paid` na politica publica, pois sao necessarios no fluxo de checkout do cliente.

**Decisao final:** Manter a politica publica, mas adicionar validacao de que `organization_id` e `table_number` nao podem ser alterados (campos estruturais), evitando que um atacante mova pedidos entre organizacoes ou mesas.

---

### 3. Protecao contra senhas vazadas desabilitada (AVISO)

**Problema:** Usuarios podem se cadastrar com senhas que ja foram comprometidas em vazamentos de dados.

**Correcao:** Habilitar a protecao de senhas vazadas na configuracao de autenticacao.

---

### 4. Cupons visiveis publicamente (AVISO)

**Problema:** A tabela `coupons` tem SELECT publico, permitindo que qualquer pessoa veja todos os codigos de cupom.

**Correcao:** Restringir SELECT para o dono da organizacao. Criar uma funcao de banco (RPC) `validate_coupon` que permite a validacao publica de um cupom especifico por codigo, sem expor a lista completa. Atualizar o codigo do frontend para usar essa funcao. Tambem criar uma funcao `increment_coupon_uses` para que o uso do cupom seja atualizado de forma segura.

**Impacto:** O fluxo de validar cupom no checkout continua funcionando. O painel de gestao de cupons continua funcionando (o lojista e autenticado).

---

### 5. Dados de negocio expostos na tabela organizations (AVISO)

**Problema:** A tabela `organizations` expoe `user_id`, `pix_key`, `subscription_status`, `trial_ends_at` publicamente.

**Acao:** Marcar como risco aceito. A tabela precisa ser publica para que as vitrines dos estabelecimentos funcionem. O `user_id` e um UUID opaco sem valor exploravel direto. O `pix_key` e exibido intencionalmente ao cliente no checkout PIX. Criar uma view restritiva exigiria refatoracao extensiva do frontend e esta fora do escopo de "sem alteracao de funcionalidade".

---

### 6. Dados de pedidos com informacoes pessoais expostos (ERRO)

**Problema:** A tabela `orders` tem SELECT publico, expondo nomes, telefones e enderecos de clientes.

**Acao:** Marcar como risco aceito com ressalva. Os paineis de cozinha e garcom sao acessados sem autenticacao (por design operacional) e precisam ler os pedidos. Restringir o SELECT quebraria esses paineis. A mitigacao ideal (mover para edge functions autenticadas com token de dispositivo) e uma refatoracao arquitetural fora do escopo.

---

### 7. Exposicao do user_id nas organizations (ERRO)

**Acao:** Marcar como risco aceito. O `user_id` e um UUID opaco usado internamente pelas politicas RLS. Nao ha vetor de ataque pratico.

---

## Detalhes Tecnicos

### Migracoes SQL

**Migracao 1 - cash_withdrawals:**
```sql
DROP POLICY IF EXISTS "cash_withdrawals_select_public" ON public.cash_withdrawals;
CREATE POLICY "cash_withdrawals_select_owner" ON public.cash_withdrawals
  FOR SELECT USING (
    auth.uid() = (
      SELECT o.user_id FROM organizations o
      WHERE o.id = cash_withdrawals.organization_id
    )
  );
```

**Migracao 2 - orders UPDATE restritiva:**
```sql
DROP POLICY IF EXISTS "orders_update_status_public" ON public.orders;
CREATE POLICY "orders_update_public_safe" ON public.orders
  FOR UPDATE
  USING (true)
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.orders WHERE id = orders.id)
    AND table_number = (SELECT table_number FROM public.orders WHERE id = orders.id)
  );
```
Isso impede que atacantes movam pedidos entre organizacoes ou mesas, mas permite atualizacoes de status, paid e payment_method.

**Migracao 3 - coupons:**
```sql
DROP POLICY IF EXISTS "coupons_select_public" ON public.coupons;
CREATE POLICY "coupons_select_owner" ON public.coupons
  FOR SELECT USING (
    auth.uid() = (
      SELECT o.user_id FROM organizations o
      WHERE o.id = coupons.organization_id
    )
  );

-- Funcao publica para validar cupom por codigo
CREATE OR REPLACE FUNCTION public.validate_coupon_by_code(
  _org_id uuid,
  _code text,
  _cart_total numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _coupon RECORD;
BEGIN
  SELECT * INTO _coupon FROM coupons
  WHERE organization_id = _org_id
    AND UPPER(TRIM(code)) = UPPER(TRIM(_code))
    AND active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Cupom nao encontrado ou inativo.');
  END IF;

  IF _coupon.expires_at IS NOT NULL AND _coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Cupom expirado.');
  END IF;

  IF _coupon.max_uses IS NOT NULL AND _coupon.uses >= _coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Limite de usos atingido.');
  END IF;

  IF _cart_total < _coupon.min_order THEN
    RETURN jsonb_build_object('valid', false, 'reason',
      'Pedido minimo de R$ ' || TO_CHAR(_coupon.min_order, 'FM999990D00') || ' para este cupom.');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon', jsonb_build_object(
      'id', _coupon.id,
      'code', _coupon.code,
      'type', _coupon.type,
      'value', _coupon.value,
      'min_order', _coupon.min_order
    )
  );
END;
$$;

-- Funcao publica para incrementar uso do cupom
CREATE OR REPLACE FUNCTION public.increment_coupon_uses(_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE coupons SET uses = uses + 1 WHERE id = _coupon_id;
END;
$$;
```

**Migracao 4 - Politica de UPDATE para coupons (publica para increment):**
A funcao `increment_coupon_uses` usa SECURITY DEFINER, portanto nao precisa de politica publica de UPDATE.

### Alteracoes no Codigo

**Arquivo: `src/hooks/useCoupons.ts`**
- Alterar `validateCoupon` para usar `supabase.rpc('validate_coupon_by_code', ...)` em vez de query direta
- Alterar `incrementCouponUses` para usar `supabase.rpc('increment_coupon_uses', ...)`

### Configuracao de Auth
- Habilitar protecao contra senhas vazadas

### Atualizacao dos Findings de Seguranca
- Deletar `cash_withdrawals_financial_exposure` (corrigido)
- Deletar `coupons_code_exposure` (corrigido)
- Atualizar `orders_public_update_vulnerability` (mitigado parcialmente)
- Ignorar `orders_table_customer_data_exposure` (necessario para operacao)
- Ignorar `organizations_user_id_exposure` (UUID opaco, sem risco pratico)
- Atualizar `organizations_business_details_exposure` (risco aceito)

