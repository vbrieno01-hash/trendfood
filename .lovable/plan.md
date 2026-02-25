

# Plano: Corrigir erro "api.whatsapp.com está bloqueado"

## Diagnóstico

O screenshot mostra que ao clicar em "Enviar Pedido", o navegador abre `api.whatsapp.com/send/...` e recebe `ERR_BLOCKED_BY_RESPONSE`. Isso acontece porque o `wa.me` redireciona para `api.whatsapp.com`, que responde com headers de segurança (COOP/COEP) que bloqueiam a abertura dentro de contextos de iframe ou quando chamado via `window.open` de certos ambientes (como o preview do Lovable).

O código atual (linha 397-402 de `UnitPage.tsx`) tenta `window.open` e faz fallback para `window.location.href`. O problema é que ambos falham quando `api.whatsapp.com` bloqueia a resposta.

A solução é usar a URL direta `https://api.whatsapp.com/send` em vez de `wa.me` (evitando o redirect), e garantir que o fallback funcione. Porém o problema real é que `api.whatsapp.com` bloqueia respostas em iframes/previews. A melhor abordagem é:

1. Trocar para `window.location.href` como método primário (em vez de `window.open`), pois navegar a página inteira tem menos chance de ser bloqueado
2. Ou melhor ainda: detectar se estamos em iframe e usar a estratégia correta

## O que sera feito

### `src/pages/UnitPage.tsx`

1. **Linha 397-403 (fluxo principal de WhatsApp)**: Inverter a estratégia — usar `window.location.href` como fallback principal quando `window.open` falhar, mas tambem adicionar um `<a>` link alternativo com `target="_blank"` que o usuario possa clicar manualmente caso tudo falhe.

2. **Linha 397**: Manter `wa.me` pois funciona em dispositivos reais (celular com WhatsApp instalado). O bloqueio acontece apenas no desktop/preview do Lovable.

3. **Adicionar tratamento de erro visivel**: Quando o WhatsApp nao conseguir abrir, mostrar um toast com o link para o usuario copiar/abrir manualmente, em vez de simplesmente falhar silenciosamente.

4. **Mesma correção na linha 503** (fluxo PIX callback) que tambem usa WhatsApp.

## Seção tecnica

```text
Arquivo: src/pages/UnitPage.tsx

Mudança 1 — linhas 396-403 (fluxo principal):
  // Substituir window.open por estratégia mais robusta
  const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(lines)}`;
  const whatsAppOpened = (() => {
    try {
      const w = window.open(url, "_blank", "noopener,noreferrer");
      return !!w;
    } catch { return false; }
  })();
  if (!whatsAppOpened) {
    // Fallback: navegar a pagina atual (funciona melhor em mobile)
    try { window.location.href = url; } catch {}
    // Toast de aviso com instrução para abrir manualmente
    toast({
      title: "Pedido enviado!",
      description: "Se o WhatsApp não abriu, toque aqui para abrir manualmente.",
      action: /* botão que abre o link */,
      duration: 10000,
    });
  }

Mudança 2 — linha ~503 (fluxo PIX callback):
  Aplicar a mesma lógica de fallback robusta.
```

Isso garante que mesmo se `api.whatsapp.com` bloquear a resposta, o usuario recebe feedback e uma forma alternativa de abrir o WhatsApp.

