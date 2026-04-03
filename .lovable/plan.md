

## Plano: Auto-save no Perfil da Loja

### Problema
O cliente precisa rolar até o final da página e clicar "Salvar alterações" toda vez que muda qualquer campo. Isso é cansativo.

### Solução
Implementar **debounced auto-save** — cada vez que o usuário altera um campo, salva automaticamente após 1.5s de inatividade. Remover o botão "Salvar" fixo no final.

### Mudanças no `StoreProfileTab.tsx`

1. **Adicionar `useRef` + `useEffect` com debounce** — sempre que `form`, `businessHours`, `addressFields`, `freeAbove` mudam, iniciar timer de 1.5s. Se mudar de novo, resetar o timer. Quando o timer dispara, chamar `handleSave()` automaticamente.

2. **Remover o `<form onSubmit>` wrapper** — trocar por `<div>`, já que não haverá mais submit manual.

3. **Remover o botão "Salvar alterações"** do final da página.

4. **Adicionar indicador flutuante** — um badge fixo no topo/canto que mostra:
   - "Salvando..." (com spinner) durante o save
   - "✓ Salvo" (por 2s após salvar com sucesso)
   - Invisível quando não há mudanças pendentes

5. **Pular auto-save no primeiro render** — usar `useRef(true)` para flag `isFirstRender` e não disparar save na montagem do componente.

6. **Manter validação de WhatsApp** — se o WhatsApp tiver menos de 10 dígitos durante o auto-save, mostrar toast de aviso mas não travar a tela.

### Código do debounce

```typescript
const saveTimeoutRef = useRef<NodeJS.Timeout>();
const isFirstRender = useRef(true);
const [autoSaveStatus, setAutoSaveStatus] = useState<"idle"|"saving"|"saved">("idle");

useEffect(() => {
  if (isFirstRender.current) {
    isFirstRender.current = false;
    return;
  }
  setAutoSaveStatus("idle");
  clearTimeout(saveTimeoutRef.current);
  saveTimeoutRef.current = setTimeout(() => {
    doSave();
  }, 1500);
  return () => clearTimeout(saveTimeoutRef.current);
}, [form, businessHours, addressFields, freeAbove]);
```

### Indicador visual (fixo no topo do componente)

```text
┌─────────────────────────────┐
│  ⟳ Salvando...              │  ← aparece durante save
│  ✓ Alterações salvas        │  ← aparece 2s após sucesso
└─────────────────────────────┘
```

### Arquivos modificados
| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/StoreProfileTab.tsx` | Debounced auto-save + remover botão + indicador de status |

