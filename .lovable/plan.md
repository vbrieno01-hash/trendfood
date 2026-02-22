
# Efeito Sonoro para Entregas + Campo PIX no Painel do Motoboy

## 1. Efeito sonoro quando chega nova entrega

Adicionar um listener realtime no `CourierPage` que toca um som de notificacao quando uma nova entrega pendente aparece na tabela `deliveries`. O som sera similar ao usado na cozinha (Web Audio API), mas com um tom diferente para diferenciar.

O som sera tocado apenas para entregas novas (INSERT) com status "pendente", evitando tocar em updates.

### Alteracoes
- `src/pages/CourierPage.tsx`: Adicionar funcao `playDeliveryBell()` usando Web Audio API e um `useEffect` com channel realtime que escuta INSERTs na tabela `deliveries` filtrado por `organization_id` e toca o som.

## 2. Campo de chave PIX na aba "Resumo"

Adicionar um campo editavel na aba "Resumo" do painel do motoboy onde ele pode cadastrar/editar sua chave PIX (CPF, telefone, e-mail ou aleatoria). O campo salva automaticamente ao clicar em "Salvar".

### Alteracoes
- `src/pages/CourierPage.tsx`: Na aba "stats" (Resumo), adicionar um card com Input para a chave PIX e botao "Salvar" que faz update na tabela `couriers`.

## Detalhes tecnicos

### Efeito sonoro
```typescript
const playDeliveryBell = () => {
  try {
    const ctx = new AudioContext();
    // Dois bips curtos ascendentes
    [0, 0.25].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = i === 0 ? 660 : 880;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
  } catch {}
};
```

Novo `useEffect` para o som:
```typescript
useEffect(() => {
  if (!orgId) return;
  const channel = supabase
    .channel(`courier-bell-${orgId}`)
    .on("postgres_changes", {
      event: "INSERT", schema: "public", table: "deliveries",
      filter: `organization_id=eq.${orgId}`
    }, () => { playDeliveryBell(); })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [orgId]);
```

### Campo PIX na aba Resumo
Estado local `pixKey` inicializado com `courier?.pix_key`. Card com Input e botao que faz:
```typescript
await supabase.from("couriers").update({ pix_key: pixKey }).eq("id", courierId);
```

A politica RLS `couriers_update_public` ja permite essa operacao.
