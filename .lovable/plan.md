

# PIX de cada Motoboy - Pagamento pelo Patrao

## Resumo
Cada motoboy cadastra sua chave PIX no painel dele. Quando o dono clica em "Pagar tudo", o sistema gera um QR Code PIX com o valor exato, o dono paga pelo banco e confirma a baixa.

## Alteracoes

| Arquivo | O que muda |
|---------|-----------|
| **Migracao SQL** | Adicionar coluna `pix_key` (text, nullable) na tabela `couriers` |
| `src/pages/CourierPage.tsx` | Na aba "Resumo", campo para o motoboy cadastrar/editar sua chave PIX com botao salvar |
| `src/components/dashboard/CourierDashboardTab.tsx` | No dialogo "Pagar tudo", mostrar QR Code PIX do motoboy com valor, e botao "Copia e Cola" antes de confirmar pagamento |
| `src/hooks/useCourier.ts` | Novo hook `useUpdateCourierPixKey` para salvar a chave PIX do motoboy. Adicionar `pix_key` ao type `Courier` |

## Fluxo

1. **Motoboy** abre aba "Resumo" no painel dele
2. Digita sua chave PIX (CPF, telefone, e-mail ou chave aleatoria) e salva
3. **Dono** abre aba Motoboys no dashboard, ve o debito pendente
4. Clica "Pagar tudo" - dialogo mostra QR Code PIX com o valor exato
5. Dono escaneia o QR no app do banco, paga, e clica "Confirmar Pagamento"
6. Entregas sao marcadas como pagas em tempo real

## Detalhes tecnicos

### Migracao
```sql
ALTER TABLE public.couriers ADD COLUMN pix_key text;
```

Politica de UPDATE ja existe restrita ao dono da org. Porem o motoboy precisa atualizar o proprio `pix_key`. Adicionar politica de UPDATE para o proprio motoboy nao e possivel pois couriers nao tem auth. Solucao: adicionar uma politica publica de UPDATE restrita apenas a coluna nao-sensivel, ou fazer o update via a politica publica existente (couriers ja tem `insert_public`). Como a tabela ja tem `select_public` e `insert_public`, vamos adicionar `update_public` com restricao para permitir o motoboy editar seus dados.

Na verdade, a tabela `couriers` nao tem RLS de update publico. Precisamos adicionar uma politica permissiva de UPDATE publica para que o motoboy (sem auth) possa atualizar sua chave PIX.

```sql
CREATE POLICY "couriers_update_public" ON public.couriers
FOR UPDATE USING (true) WITH CHECK (true);
```

### Geracao do QR Code PIX
Usar a funcao `buildPixPayload` de `src/lib/pixPayload.ts` diretamente no frontend (nao precisa de edge function, pois a chave PIX e do motoboy, nao e segredo da loja). Renderizar com `qrcode.react` que ja esta instalado.

### Painel do Motoboy - campo PIX
Na aba "Resumo", adicionar um card com Input para a chave PIX e botao "Salvar". O motoboy faz update direto na tabela `couriers` com seu ID.

### Dialogo de pagamento do dono
Substituir o dialogo simples por um que:
1. Verifica se o motoboy tem `pix_key` cadastrada
2. Se sim: gera o payload PIX com `buildPixPayload(courier.pix_key, valor, "MOTOBOY")`, renderiza QR Code e botao "Copiar Pix Copia e Cola"
3. Se nao: mostra aviso "Motoboy nao cadastrou chave PIX"
4. Botao "Confirmar Pagamento" no final para dar a baixa

