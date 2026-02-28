

## Bug: Botão "Assinar Pro" redireciona para `/planos` em vez de abrir o UpgradeDialog

### Problema
O banner de trial na aba Home usa `<Link to="/planos">`, que navega para a página de preços externa. O esperado é abrir o `UpgradeDialog` inline, como acontece em outros pontos do dashboard.

### Correção — `src/pages/DashboardPage.tsx`

1. **Adicionar estado para controlar o UpgradeDialog** (junto dos outros estados do componente):
```typescript
const [upgradeOpen, setUpgradeOpen] = useState(false);
```

2. **Importar o UpgradeDialog** (já existe no projeto):
```typescript
import UpgradeDialog from "@/components/dashboard/UpgradeDialog";
```

3. **Substituir o botão do banner de trial ativo** (~linha 826-828):
   - De: `<Button asChild><Link to="/planos">...Assinar Pro</Link></Button>`
   - Para: `<Button size="sm" className="gap-1.5" onClick={() => setUpgradeOpen(true)}><Zap />Assinar Pro</Button>`

4. **Fazer o mesmo no banner de trial expirado** (~linha 839-841):
   - De: `<Button asChild><Link to="/planos">...Fazer upgrade</Link></Button>`
   - Para: `<Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setUpgradeOpen(true)}><Zap />Fazer upgrade</Button>`

5. **Fazer o mesmo no banner de assinatura expirando** (se houver botão similar mais abaixo).

6. **Renderizar o UpgradeDialog** no final do JSX, antes do `</div>` de fechamento:
```tsx
<UpgradeDialog
  open={upgradeOpen}
  onOpenChange={setUpgradeOpen}
  orgId={organization.id}
  currentPlan={planLimits.plan}
/>
```

Nenhuma outra alteração necessária — o fluxo de checkout já funciona dentro do `UpgradeDialog`.

