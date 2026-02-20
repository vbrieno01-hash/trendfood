

# Teste completo do Multi-unidade

## Situacao atual verificada

Fiz login com o usuario `teste-multiunit@test.com` e confirmei:
- Dashboard carrega normalmente com "Loja Matriz" no sidebar
- O OrgSwitcher aparece no topo do sidebar com emoji, nome e slug
- As abas "Funcionalidades" e "Como Usar" estao visiveis no sidebar
- O plano atual eh "free" (banner de trial de 7 dias aparece)

## Passos para testar o fluxo completo

### Passo 1: Atualizar plano para Enterprise

Executar o seguinte UPDATE no banco de dados:

```text
UPDATE organizations 
SET subscription_plan = 'enterprise' 
WHERE id = 'fa7affd1-389b-4c93-b925-507ec39a559e'
```

Isso vai desbloquear a funcionalidade `multi_unit` no `usePlanLimits`.

### Passo 2: Recarregar o dashboard

Apos o UPDATE, recarregar a pagina para que o `useAuth` busque os dados atualizados. O banner de trial deve desaparecer e o botao "Nova unidade" deve aparecer no OrgSwitcher.

### Passo 3: Abrir o OrgSwitcher e clicar "Nova unidade"

- Clicar no seletor de unidade no sidebar
- Verificar que o botao "Nova unidade" com badge "Enterprise" aparece
- Clicar nele para abrir o dialog de criacao

### Passo 4: Criar segunda filial

- Preencher nome: "Loja Norte"
- Verificar que o slug auto-gera "loja-norte"
- Opcionalmente preencher WhatsApp
- Clicar "Criar unidade"

### Passo 5: Verificar resultado

- Confirmar que a nova org aparece no OrgSwitcher
- Trocar entre "Loja Matriz" e "Loja Norte"
- Verificar que o dashboard muda de contexto (dados separados)
- Confirmar que cada unidade tem cardapio e pedidos independentes

---

## O que vou implementar

Ao aprovar este plano, vou:

1. Fazer o UPDATE do plano para Enterprise no banco
2. Testar pelo browser todo o fluxo de criacao de nova unidade
3. Verificar a troca entre unidades no OrgSwitcher
4. Reportar os resultados completos do teste

