

## Plano — Sumir o "buraco branco" do contador AO VIVO

O espaço vazio que você está vendo é o componente **LiveOrderCounter** com o número gigante invisível (FlipDigit bugado + gradiente de texto sem fallback). E ele é **redundante** porque o Hero já mostra o contador de pedidos.

### Diagnóstico exato

Olhando a screenshot: aparece o badge verde "AO VIVO", um espaço vazio enorme (onde deveria estar `9.999` em laranja gigante), e a legenda "pedidos feitos no TrendFood". O número não renderiza por dois bugs no `FlipDigit`:

1. **Wrapper com altura quebrada**: `<div style={{ height: "1em", width: "0.6em" }}>` + filho `absolute inset-0` dentro de container `items-baseline` → o flex com baseline ignora a altura do inline-block e o dígito cai fora do recorte
2. **Gradiente de texto sem cor de fallback**: classe `landing-gradient-text` aplica `color: transparent` + `background-clip: text` — se o background-image falhar ou demorar, fica texto transparente sobre fundo branco
3. **Redundância**: o `HeroCinematic` no topo já renderiza `displayCount` + `orderCounterText` — ter dois contadores enche linguiça

### Correção (escolha mais limpa)

**Remover o `<LiveOrderCounter />` do `Index.tsx`.**

Justificativa:
- O contador já aparece no Hero (linha 175-177 do Index.tsx passa `orderCount`/`displayCount`/`orderCounterText` pro HeroCinematic)
- Tirar a seção elimina o "espaço vazio" reclamado
- Página fica mais enxuta (menos scroll desnecessário)
- Sequência fica: Hero (com contador) → Marquee → Benefícios → Problemas → ... (mais fluida)

### Mudança exata

**`src/pages/Index.tsx`**:
- Remover linhas 184-187 (bloco `{orderCount > 0 && <LiveOrderCounter ... />}`)
- Remover import da linha 10 (`import LiveOrderCounter from "@/components/landing/LiveOrderCounter";`)
- Manter o arquivo `LiveOrderCounter.tsx` no projeto (não apaga, fica disponível caso queira usar futuramente em outra página)

### Resultado

- O "espaço em branco" da screenshot desaparece completamente
- Contador continua aparecendo (no Hero, onde já estava funcionando)
- Fluxo da landing fica: Hero com contador ao vivo → Marquee de social proof → Benefícios → Problemas em stack 3D → Comparativo animado → Calculadora → Timeline → Showcase sticky → Funcionalidades → Planos → CTA
- Sem efeito quebrado, sem duplicação, sem buraco

Mudança mínima e cirúrgica: 2 linhas removidas no `Index.tsx`.

