

## Plano: Blindar botão flutuante do WhatsApp — 100% funcional

### Problemas potenciais identificados

1. **Número com formatação inconsistente**: Se `org.whatsapp` vier com caracteres como `(`, `)`, `-`, espaços, o link `wa.me/55(11)9...` quebra silenciosamente — o WhatsApp não abre.
2. **Prefixo `55` duplicado**: Se o lojista salvou o número já com `55` na frente (ex: `5511999...`), o link vira `wa.me/555511999...` — inválido.
3. **`encodeURIComponent` inline**: Funciona, mas a URL fica longa e difícil de manter. Melhor extrair para variável.

### Solução

**Arquivo: `src/pages/UnitPage.tsx`**

1. **Sanitizar o número** antes de montar a URL: remover tudo que não é dígito, e remover prefixo `55` se já existir para evitar duplicação.
2. **Extrair a URL do WhatsApp** para uma variável `whatsappHelpUrl` calculada uma vez, usada no `<a href>`.
3. **Adicionar guard extra**: se após sanitização o número tiver menos de 10 dígitos, não renderizar o botão (evita link quebrado).

```tsx
// Após linha 270 (onde whatsapp é extraído)
const rawWa = org?.whatsapp?.replace(/\D/g, "") ?? "";
const cleanWa = rawWa.startsWith("55") ? rawWa : `55${rawWa}`;
const whatsappValid = cleanWa.length >= 12; // 55 + DDD(2) + número(8-9)
const whatsappHelpUrl = whatsappValid
  ? `https://wa.me/${cleanWa}?text=${encodeURIComponent("Olá! Gostaria de tirar uma dúvida sobre a loja. Pode me ajudar?")}`
  : "";
```

4. **No JSX do botão**: trocar a condição de `org?.whatsapp` para `whatsappValid`, e usar `whatsappHelpUrl` no `href`.

### Resultado
- Números com formatação estranha (`(11) 99999-1234`) funcionam
- Números já com `55` não ficam duplicados
- Números inválidos/curtos escondem o botão em vez de abrir link quebrado
- O `<a>` nativo continua garantindo que não há bloqueio de popup

### Arquivo modificado
| Arquivo | Mudança |
|---------|---------|
| `src/pages/UnitPage.tsx` | Sanitizar número WhatsApp e adicionar validação antes de renderizar o botão |

