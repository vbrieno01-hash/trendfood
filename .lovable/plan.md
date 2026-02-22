

# Diagnostico e Correcao: Insert falhando para lojas novas

## Analise das politicas RLS

Verifiquei as politicas da tabela `fila_impressao` diretamente no banco. Todas sao **PERMISSIVE** e a politica de INSERT usa:

```sql
WITH CHECK (auth.uid() = (
  SELECT organizations.user_id FROM organizations
  WHERE organizations.id = fila_impressao.organization_id
))
```

Isso esta correto -- se o usuario esta logado e e dono da organizacao, o INSERT deve funcionar. **A RLS nao precisa ser desabilitada.**

## Causa provavel

O problema mais provavel e que o objeto `organization` esta `null` no momento do clique (por exemplo, se a organizacao ainda nao foi carregada ou se houve erro na consulta inicial). O codigo atual faz `if (!organization?.id) return;` -- ou seja, **falha silenciosamente** sem nenhum feedback.

## O que sera feito

### 1. Feedback visual direto no botao/toast (SettingsTab.tsx)

- Quando `organization` for `null`, mostrar um toast de erro explicito em vez de retornar silenciosamente
- Exibir a mensagem de erro do banco diretamente no toast (nao apenas no console)
- Manter os `console.error` ja adicionados para debug avancado

### 2. Validacao preventiva

- Adicionar verificacao se `organization?.id` existe antes do INSERT, com mensagem clara: "Organizacao nao encontrada. Tente recarregar a pagina."

### Secao tecnica

**Arquivo: `src/components/dashboard/SettingsTab.tsx`** -- funcao `handleTestPrint`:

```typescript
const handleTestPrint = async () => {
  if (!organization?.id) {
    toast.error("Organização não encontrada. Recarregue a página e tente novamente.");
    return;
  }
  setTestPrintLoading(true);
  try {
    // ... conteudo existente ...
    await enqueuePrint(organization.id, null, content);
    toast.success("Teste enviado para a fila de impressão!");
  } catch (err: any) {
    console.error("Erro ao testar impressora:", err);
    console.error("organization.id usado:", organization?.id);
    const msg = err?.message || "Erro desconhecido";
    toast.error(`Falha ao enviar teste: ${msg}`);
  } finally {
    setTestPrintLoading(false);
  }
};
```

Isso vai permitir identificar exatamente o que esta falhando:
- Se o toast diz "Organizacao nao encontrada" --> problema no carregamento da sessao/org
- Se o toast diz "new row violates row-level security" --> problema de RLS (improvavel pela analise acima)
- Se o toast diz outro erro --> problema de conexao ou schema

