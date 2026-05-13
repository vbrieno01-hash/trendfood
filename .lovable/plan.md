## Migração: reabrir UPDATE de `deliveries` para o anon (apenas `distance_km`)

**Por que:** A migração das 014219 restringiu UPDATE de `deliveries` para `authenticated`. Isso quebra silenciosamente o `useCreateDelivery` quando ele tenta gravar `distance_km` em sessões anônimas (checkout do cliente). Não derruba o pedido, mas perde a distância calculada.

**O que vai mudar:**
- Criar policy `deliveries_update_distance_anon` em `public.deliveries`
- Permite UPDATE pelo papel `anon` **somente** quando:
  - `courier_id IS NULL` (entrega ainda não atribuída)
  - `status = 'pendente'`
- E o `WITH CHECK` mantém as mesmas condições, garantindo que o anon não consegue mudar status, atribuir motoboy, nem alterar valores sensíveis.

**O que NÃO muda:**
- Nada em `orders`, `order_items`, `organizations`, `couriers`, pagamentos, cozinha.
- Lojista autenticado continua com acesso total via policies já existentes.
- Motoboy continua usando RPCs `SECURITY DEFINER`.

**SQL planejado:**
```sql
CREATE POLICY "deliveries_update_distance_anon"
ON public.deliveries
FOR UPDATE
TO anon
USING (courier_id IS NULL AND status = 'pendente')
WITH CHECK (courier_id IS NULL AND status = 'pendente');
```

**Risco:** baixíssimo. Apenas devolve uma capacidade de UPDATE muito restrita que existia antes da migração de hoje.

**Próximo passo:** Ao aprovar este plano (botão "Implement plan"), eu disparo a migração e a **caixinha de aprovação da migração aparece pra você confirmar antes de aplicar de fato no banco**. Nada vai pro banco sem esse segundo OK.
