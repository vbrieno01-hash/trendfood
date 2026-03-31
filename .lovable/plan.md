

## Plano: Limpar dados órfãos de exclusões antigas

### Situação
O `DeleteUnitDialog.tsx` atual já está completo e correto — cobre todas as 24 tabelas + storage. Porém, exclusões feitas **antes** da correção deixaram resíduos:

| Tabela | Órfãos | Org IDs |
|--------|--------|---------|
| `courier_shifts` | 4 | `e75374b7-...` |
| `terms_acceptances` | 2 | `8b558ccf-...` |
| `activation_logs` | 10 | 5 orgs diferentes |

### Ação
Executar uma limpeza única via migration (DELETE) para remover os 16 registros órfãos:

```sql
DELETE FROM courier_shifts WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE id = courier_shifts.organization_id);
DELETE FROM terms_acceptances WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE id = terms_acceptances.organization_id);
DELETE FROM activation_logs WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE id = activation_logs.organization_id);
```

### Resultado
- Zero dados órfãos no banco
- Código de exclusão já está robusto para futuras exclusões
- Nenhuma alteração de código necessária

### Arquivos alterados
- Nenhum arquivo de código (apenas limpeza de dados no banco)

