
# Diagnóstico e Correção — Notificações da Cozinha

## Problema Relatado
O toggle "🔔 Notificações" na aba Cozinha (KDS) não está funcionando corretamente.

---

## Diagnóstico: 3 bugs identificados

### Bug 1 — O toggle de notificações começa SEMPRE desativado (crítico)

No `KitchenTab.tsx`, linha 58:
```typescript
// ESTADO INICIAL: só ativa se localStorage = "true"
const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
  () => localStorage.getItem(NOTIF_KEY) === "true"
);
```

Porém na função `toggleNotifications` (linha 70), ao ativar o toggle, o código pede permissão do navegador. Se o navegador **já tinha concedido permissão** anteriormente (em sessão anterior), o fluxo funciona normalmente. Mas se o navegador **bloquear ou negar**, o estado não é salvo e o toggle não muda visualmente — o usuário pensa que funcionou mas não funcionou. Não há nenhum feedback de erro ou aviso.

### Bug 2 — Nenhum feedback ao usuário quando a permissão é negada (UX crítico)

```typescript
const toggleNotifications = async (val: boolean) => {
  if (val) {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return; // ← silencioso! O toggle visualmente "volta" mas sem explicação
    }
  }
  // ...
};
```

Quando o navegador nega (ou o usuário clica "Bloquear"), a função simplesmente retorna sem nada. O toggle do Switch reverte, mas o usuário não sabe **por que** nem **como resolver**.

### Bug 3 — O canal Realtime cria conflito com o canal do `useOrders`

Em `useOrders.ts` (linha 121), já existe um canal Realtime para os pedidos:
```
channel: `orders-${organizationId}-${statuses.join("-")}`
```

Em `KitchenTab.tsx` (linha 104), há um segundo canal paralelo:
```
channel: `kitchen-tab-${orgId}`
```

Ambos escutam `INSERT` na tabela `orders` com o mesmo filtro. O Supabase Realtime pode entregar o evento apenas ao primeiro canal registrado, fazendo com que o sino e as notificações não disparem em alguns casos. Além disso, toda vez que `autoPrint` ou `notificationsEnabled` mudam (linha 137), o canal é destruído e recriado — com risco de perder eventos durante a reconexão.

---

## Raiz dos problemas

```text
1. Toggle silencioso sem feedback → usuário não sabe que permissão foi negada
2. Canal Realtime duplicado → eventos podem não chegar ao handler de notificações
3. useEffect com dependências mutáveis (autoPrint, notificationsEnabled) → canal reinicia desnecessariamente
```

---

## Solução proposta

### Arquivo: `src/components/dashboard/KitchenTab.tsx`

**Correção 1 — Feedback visual ao negar permissão**

Importar `toast` (sonner) e mostrar uma mensagem orientando o usuário a habilitar manualmente no navegador quando a permissão for negada:

```typescript
import { toast } from "sonner";

const toggleNotifications = async (val: boolean) => {
  if (val) {
    const permission = await Notification.requestPermission();
    if (permission === "denied") {
      toast.error("Notificações bloqueadas pelo navegador", {
        description: "Clique no cadeado na barra de endereço e permita notificações para este site.",
        duration: 8000,
      });
      return;
    }
    if (permission !== "granted") {
      toast.warning("Permissão de notificação não concedida.");
      return;
    }
  }
  setNotificationsEnabled(val);
  localStorage.setItem(NOTIF_KEY, String(val));
};
```

**Correção 2 — Estabilizar o canal Realtime com `useRef` para evitar recriação**

Usar refs para `autoPrint` e `notificationsEnabled` dentro do `useEffect`, eliminando-os das dependências. Isso evita que o canal Realtime seja destruído e recriado cada vez que o toggle é alterado:

```typescript
const autoPrintRef = useRef(autoPrint);
const notificationsRef = useRef(notificationsEnabled);

// Sincronizar refs com estado
useEffect(() => { autoPrintRef.current = autoPrint; }, [autoPrint]);
useEffect(() => { notificationsRef.current = notificationsEnabled; }, [notificationsEnabled]);

// Canal Realtime: usar refs dentro do handler, sem deps mutáveis
useEffect(() => {
  if (!orgId) return;
  const channel = supabase
    .channel(`kitchen-tab-${orgId}`)
    .on("postgres_changes", { event: "INSERT", ... }, (payload) => {
      const order = payload.new as Order;
      if (!knownIds.current.has(order.id)) {
        knownIds.current.add(order.id);
        playBell();
        if (autoPrintRef.current) { // ← usa ref, não estado
          pendingPrintIds.current.add(order.id);
        }
        if (notificationsRef.current && Notification.permission === "granted") { // ← ref
          new Notification(`🔔 Novo pedido!`, { ... });
        }
        qc.invalidateQueries(...);
      }
    })
    // ...
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [orgId, qc]); // ← apenas orgId e qc como dependências
```

**Correção 3 — Indicador visual do estado da permissão**

Mostrar badge informativo ao lado do toggle para indicar o estado atual da permissão (`granted` / `denied` / `default`), assim o usuário sabe imediatamente se as notificações estão realmente ativas no navegador:

```text
[🔔 Notificações] [Switch ON] ← badge verde "Ativo"
[🔔 Notificações] [Switch OFF] ← badge cinza
[🔔 Notificações] [Switch bloqueado] ← badge vermelho "Bloqueado pelo navegador"
```

---

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/components/dashboard/KitchenTab.tsx` | Feedback ao negar permissão, canal Realtime estável com refs, badge de status |

Nenhuma mudança de banco de dados necessária.

---

## Resumo das correções

- 1 arquivo modificado: `KitchenTab.tsx`
- Zero novas dependências
- O sino e o auto-print continuam funcionando normalmente
- O canal Realtime não será mais reiniciado ao trocar os toggles
- O usuário receberá feedback claro quando as notificações forem bloqueadas
