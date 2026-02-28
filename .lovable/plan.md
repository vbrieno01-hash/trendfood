

# Auditoria Completa do Fluxo de Assinatura

## Status: Tudo correto no lado do código

### Pontos de entrada verificados (todos apontam para `/planos` ou direto para o checkout)

1. **Landing page (`/`)** — 3 links para `/planos` (header, CTA principal, footer)
2. **Dashboard banners** — 4 banners (trial ativo, trial expirando, trial expirado, plano grátis) todos linkam para `/planos`
3. **UpgradePrompt** — componente usado em tabs bloqueadas (Cozinha, Garçom, Cupons, etc.) linka para `/planos`
4. **FeaturesTab** — botão "Fazer upgrade" linka para `/planos`
5. **HistoryTab** — link inline "Fazer upgrade" aponta para `/planos`
6. **SubscriptionTab** — checkout interno com Mercado Pago (PIX + Cartão)

### Fluxo completo verificado

```text
/planos → Dialog de confirmação → /dashboard?tab=subscription&plan=pro
                                    ↓
                         SubscriptionTab lê ?plan=pro
                                    ↓
                         Abre checkout Mercado Pago automaticamente
                                    ↓
                    PIX: gera QR Code + polling a cada 10s
                    Cartão: tokeniza via SDK MP + envia pagamento
                                    ↓
                    Webhook (mp-webhook) atualiza org no banco
```

### Fluxo deslogado

```text
/planos (deslogado) → /auth?redirect=/planos&plan=pro
                         ↓
                    Login/Cadastro
                         ↓
                    Redireciona para /planos?plan=pro
                         ↓
                    useEffect reabre dialog automaticamente
```

### Secrets do Mercado Pago: OK
- `MERCADO_PAGO_ACCESS_TOKEN` — configurado
- `MERCADO_PAGO_PUBLIC_KEY` — configurado

### Edge Functions envolvidas (todas deployadas)
- `create-mp-payment` — cria pagamento PIX ou cartão
- `get-mp-public-key` — retorna public key para SDK do cartão
- `mp-webhook` — recebe notificação de pagamento aprovado e ativa o plano
- `check-subscription-pix` — polling do status do PIX

### O que NÃO consigo testar automaticamente
- **Pagamento real no Mercado Pago** — requer credenciais de produção e um pagamento verdadeiro. Não há como simular isso via automação do browser.
- **Webhook callback** — o Mercado Pago precisa chamar a URL do webhook (`mp-webhook`) após o pagamento. Isso depende do webhook estar configurado no painel do Mercado Pago apontando para a URL correta da edge function.

### Ponto de atenção
O webhook do Mercado Pago precisa estar configurado no painel do MP apontando para:
`https://xrzudhylpphnzousilye.supabase.co/functions/v1/mp-webhook`

Se isso não estiver configurado, pagamentos PIX serão gerados mas o plano não será ativado automaticamente (apenas o polling do `check-subscription-pix` tentaria verificar).

### Conclusão
Todo o código está correto e conectado. Os redirecionamentos funcionam, o checkout interno do Mercado Pago está integrado, e os webhooks estão prontos. A única validação pendente é confirmar que a URL do webhook está cadastrada no painel do Mercado Pago.

