

# Plano: Corrigir botão "Enviar Pedido" que não responde ao clique

## Diagnóstico

O problema é que quando a validação do formulário falha (campos obrigatórios não preenchidos), a função `handleSendWhatsApp` simplesmente faz `return` na linha 297 sem nenhum feedback visível perto do botão. Os indicadores de erro (textos vermelhos) ficam espalhados pelo formulário acima, fora da área visível do usuário, que está olhando para o botão no rodapé do Drawer.

Resultado: o usuário clica no botão, a validação falha silenciosamente, e parece que "nada acontece".

## O que será feito

### `src/pages/UnitPage.tsx`

1. **Adicionar scroll automático para o primeiro campo com erro** — Quando a validação falhar, fazer scroll até o primeiro campo inválido para que o usuário veja qual campo precisa preencher.

2. **Adicionar toast de aviso** — Exibir um toast rápido ("Preencha os campos obrigatórios") quando a validação falhar, para dar feedback imediato ao usuário mesmo que ele não veja os campos de erro.

3. **Adicionar refs aos campos obrigatórios** — Para permitir o scroll automático ao primeiro erro.

## Seção técnica

```text
Arquivo: src/pages/UnitPage.tsx

Mudança 1 — imports (linha 1):
+ import { useToast } from "@/hooks/use-toast";

Mudança 2 — dentro do componente:
+ const { toast } = useToast();
+ const orderTypeRef = useRef<HTMLDivElement>(null);
+ const nameRef = useRef<HTMLInputElement>(null);
+ const phoneRef = useRef<HTMLInputElement>(null);
+ const paymentRef = useRef<HTMLDivElement>(null);
+ const addressRef = useRef<HTMLDivElement>(null);

Mudança 3 — handleSendWhatsApp, após "if (!valid) return;" (linha 297):
  if (!valid) {
+   toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
+   // Scroll to first error
+   const firstErrorRef = !orderType ? orderTypeRef
+     : !buyerName.trim() ? nameRef
+     : buyerPhone.replace(/\D/g,"").length < 10 ? phoneRef
+     : orderType === "Entrega" && addressError ? addressRef
+     : !effectivePayment ? paymentRef
+     : null;
+   firstErrorRef?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

Mudança 4 — adicionar ref nos elementos JSX correspondentes:
  - div do orderType → ref={orderTypeRef}
  - input do buyerName → ref={nameRef}
  - input do buyerPhone → ref={phoneRef}
  - div do endereço → ref={addressRef}
  - div do pagamento → ref={paymentRef}
```

Isso garante que o usuário sempre receba feedback quando clica no botão e a validação falha.

