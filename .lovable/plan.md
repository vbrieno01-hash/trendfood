

## Diagnóstico do problema real

O problema acontece porque no Android, ao abrir a galeria, o WebView pode ser **completamente destruído e recriado** pelo sistema operacional. Quando isso ocorre:

1. O `DashboardPage` re-monta (visível nos logs: múltiplos `[Dashboard] Mount`)
2. O `MenuTab` re-monta do zero
3. O draft está em `sessionStorage` — que **pode ser apagado** quando o Android destrói o WebView
4. Sem draft, `modalOpen` inicia como `false` → o modal não reabre
5. O usuário vê a lista do cardápio (ou pior, volta para a tab "home")

A mensagem "foto salva" que você vê indica que o APK atual ainda pode estar rodando uma versão anterior do código. Mas independente disso, a raiz do problema é a mesma: **`sessionStorage` não sobrevive à destruição do WebView no Android**.

## Solução: localStorage + rehydration robusta

### Mudanças em `src/components/dashboard/MenuTab.tsx`:

1. **Trocar `sessionStorage` por `localStorage`** nas funções `saveDraft`, `loadDraft` e `clearDraft`. O `localStorage` persiste mesmo quando o Android destrói e recria o WebView.

2. **Salvar o draft ANTES de abrir o file picker**: No momento em que o usuário clica em "Adicionar foto", persistir o draft imediatamente no `localStorage` para garantir que, se o WebView for destruído durante a galeria, o estado é recuperável.

3. **Rehydration no mount**: O código atual já tenta rehydratar do draft no mount (`initialDraft`), mas como usa `sessionStorage`, falha. Com `localStorage`, o draft será encontrado e o modal reabrirá automaticamente.

4. **Limpar draft com TTL mais curto**: Manter o TTL de 30 minutos, mas agora que está em `localStorage`, garantir limpeza no `closeModal` e no `handleSubmit`.

5. **Adicionar log de diagnóstico** no `handleImageChange` para confirmar que a foto foi selecionada corretamente sem nenhum efeito colateral.

### Mudanças em `src/pages/DashboardPage.tsx`:

6. **Preservar tab ativa no `localStorage`**: Ao trocar de tab, salvar no `localStorage`. No `getInitialTab`, checar `localStorage` como fallback além do URL. Assim, se o WebView reiniciar sem query params, a tab correta é restaurada.

### O que NÃO muda
- Estrutura do modal (continua div pura)
- Input file continua fora do modal (já está correto)
- `handleImageChange` continua 100% síncrono
- Upload continua diferido para o "Salvar"
- AlertDialog de exclusão, lista de itens, filtros

### Detalhes técnicos

**Por que `sessionStorage` falha no Android:**
O `sessionStorage` está vinculado à "sessão do tab/window". Quando o Android mata o processo do WebView para liberar memória (o que acontece frequentemente ao abrir Activities pesadas como a galeria de fotos), a sessão é destruída. O `localStorage`, por outro lado, persiste no disco e sobrevive a esse ciclo.

**Por que o StoreProfileTab funciona:**
Ele não usa modal nem draft. O input file está diretamente na página, e o componente não depende de estado complexo para funcionar. Quando o WebView re-monta, o StoreProfileTab simplesmente re-renderiza normalmente sem precisar restaurar estado.

**Fluxo corrigido:**
```text
1. Usuário abre "Novo Item" → draft salvo no localStorage
2. Clica "Adicionar foto" → draft atualizado no localStorage
3. Galeria abre → Android pode destruir WebView
4. Foto selecionada → 2 cenários:
   a) WebView sobreviveu → onChange dispara, foto aparece no preview ✓
   b) WebView foi destruído → app re-monta → lê draft do localStorage
      → modal reabre → usuário re-seleciona foto (1 toque) ✓
```

