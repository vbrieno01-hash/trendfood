

## Diagnóstico: Por que o Perfil da Loja salva foto e o Cardápio nao

### Diferença fundamental entre os dois fluxos

**Perfil da Loja (funciona):**
```text
Input file → handleLogoUpload → upload IMEDIATO para storage → salva URL no banco
```
O upload acontece **no mesmo instante** que o usuario seleciona a foto. Nao depende de estado React.

**Cardápio (falha):**
```text
pickPhotoNative → salva File no state (form.imageFile) → usuario clica "Salvar" → handleSubmit → mutation → uploadMenuImage
```
O File fica guardado no estado React. No Android, entre selecionar a foto e clicar "Salvar", o WebView pode perder o estado (garbage collection, Activity restart parcial), e `form.imageFile` vira `null` ou um objeto corrompido.

### Correção: Upload imediato igual ao Perfil da Loja

Vamos copiar exatamente o padrao que funciona:

1. **Quando o usuario selecionar foto** (nativa ou input file) → fazer upload **imediatamente** para o storage
2. Guardar no estado apenas a **URL** resultante (string), nao o File
3. No `handleSubmit`, usar a URL ja pronta — sem upload pendente

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/MenuTab.tsx` | Upload imediato no `handleNativePhoto` e `handleImageChange`, guardar URL no state em vez de File |
| `src/hooks/useMenuItems.ts` | Remover upload de dentro das mutations (add/update), usar `image_url` ja pronta |

### Detalhes da implementacao

**MenuTab.tsx:**
- `handleNativePhoto`: apos criar o File, fazer `uploadMenuImage(orgId, tempId, file)` imediatamente e guardar a URL no form
- `handleImageChange` (input web): mesmo padrao — upload imediato
- Usar um ID temporario (`crypto.randomUUID()`) para o path no storage quando for item novo
- Mostrar spinner durante upload da foto
- Se upload falhar, mostrar erro e nao permitir salvar

**useMenuItems.ts:**
- `useAddMenuItem`: receber `image_url` pronta, sem upload interno
- `useUpdateMenuItem`: idem — se `image_url` mudou, ja esta no storage
- Manter `uploadMenuImage` como funcao exportada para ser chamada pelo MenuTab

### Fluxo corrigido
```text
Usuario seleciona foto
  → Upload IMEDIATO para storage (igual perfil da loja)
  → Toast "Foto enviada ✓"
  → URL salva no state
Usuario clica "Salvar"
  → Insert/Update com image_url pronta
  → Sem upload pendente, sem risco de perder o File
```

### Comportamento escolhido
Se o upload da foto falhar, o item **nao sera salvo** (tudo ou nada). O usuario vera o erro e podera tentar novamente.

### Apos implementar
```text
git pull
npm run build
npx cap sync
cd android
.\gradlew.bat assembleDebug
```

