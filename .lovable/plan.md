

# Plano: Banner de aviso de expiração de assinatura paga

## O que muda

Adicionar um banner no dashboard que aparece quando o plano pago (`pro` ou `enterprise`) está prestes a expirar --- por exemplo, faltando 7 dias ou menos. O banner mostra "Sua assinatura expira em X dias" com um botão para renovar.

Também adicionar um banner para quando a assinatura já expirou (similar ao que já existe para trial expirado).

## Onde aparece

Na mesma área dos banners existentes (trial ativo, trial expirado, impressora), logo após o banner de trial expirado, linhas 824-825 do `DashboardPage.tsx`.

## Lógica

- **Assinatura expirando** (`subscriptionDaysLeft > 0 && subscriptionDaysLeft <= 7`): banner amarelo/âmbar com "Sua assinatura expira em X dias"
- **Assinatura expirada** (`subscriptionExpired`): banner vermelho com "Sua assinatura expirou. Renove para continuar usando todos os recursos."

Os dados `subscriptionDaysLeft` e `subscriptionExpired` já existem no hook `usePlanLimits` após a última alteração.

## Seção técnica

```text
EDIT: src/pages/DashboardPage.tsx
  - Após linha 824 (banner de trial expirado): adicionar dois novos banners condicionais
  - Banner 1: assinatura expirando (âmbar, ≤7 dias)
  - Banner 2: assinatura expirada (vermelho)
  - Usa planLimits.subscriptionDaysLeft e planLimits.subscriptionExpired que já existem
```

### Código dos banners

```tsx
{/* Assinatura paga expirando */}
{!planLimits.subscriptionExpired && planLimits.subscriptionDaysLeft > 0 && planLimits.subscriptionDaysLeft <= 7 && (
  <div className="mb-4 rounded-xl bg-amber-50 border border-amber-300 p-4 flex items-center justify-between gap-3 flex-wrap">
    <div className="flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
      <p className="text-sm font-medium text-foreground">
        Sua assinatura expira em <strong>{planLimits.subscriptionDaysLeft} {planLimits.subscriptionDaysLeft === 1 ? "dia" : "dias"}</strong>. Renove para não perder acesso.
      </p>
    </div>
    <Button asChild size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700">
      <Link to="/planos"><Zap className="w-3.5 h-3.5" />Renovar</Link>
    </Button>
  </div>
)}

{/* Assinatura paga expirada */}
{planLimits.subscriptionExpired && (
  <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/30 p-4 flex items-center justify-between gap-3 flex-wrap">
    <div className="flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
      <p className="text-sm font-medium text-foreground">
        Sua assinatura expirou. Renove para continuar usando todos os recursos.
      </p>
    </div>
    <Button asChild size="sm" variant="destructive" className="gap-1.5">
      <Link to="/planos"><Zap className="w-3.5 h-3.5" />Renovar agora</Link>
    </Button>
  </div>
)}
```

Mudança em apenas 1 arquivo. Os dados já estão prontos no hook.

