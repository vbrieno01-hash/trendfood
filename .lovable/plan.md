

# Diagnostico e Correcao: Botao "Testar Impressora" para Lojas Novas

## Problema identificado

A politica de RLS na tabela `fila_impressao` esta correta (INSERT vinculado a `auth.uid() = organizations.user_id`). O problema real e que o bloco `catch` no `handleTestPrint` engole o erro sem registrar no console, impossibilitando o diagnostico.

## O que sera feito

### 1. Adicionar logging detalhado no botao de teste

No arquivo `src/components/dashboard/SettingsTab.tsx`, alterar o `handleTestPrint` para:
- Logar o `organization.id` antes de tentar inserir
- Logar o erro completo retornado pelo banco no `catch`

### 2. Adicionar logging na funcao `enqueuePrint`

No arquivo `src/lib/printQueue.ts`, ja existe um `console.error` mas ele nao mostra o `orgId` enviado. Sera adicionado o ID na mensagem para facilitar o rastreio.

### Secao tecnica

**Arquivo: `src/components/dashboard/SettingsTab.tsx`** -- bloco catch do `handleTestPrint`:

```typescript
} catch (err) {
  console.error("Erro ao testar impressora:", err);
  console.error("organization.id usado:", organization?.id);
  toast.error("Erro ao enviar teste de impressão. Veja o console para detalhes.");
}
```

**Arquivo: `src/lib/printQueue.ts`** -- funcao `enqueuePrint`:

```typescript
console.error("Failed to enqueue print job for org:", orgId, error);
```

Essas mudancas permitirao ver no console do navegador exatamente qual erro o banco retorna (ex: "new row violates row-level security policy") e confirmar que o `organization_id` correto esta sendo enviado.

