

## Plano: Botão flutuante de WhatsApp na página do cliente

### Mudança

**Arquivo: `src/pages/UnitPage.tsx`**

1. Importar `openWhatsAppWithFallback` de `@/lib/whatsappRedirect`
2. Adicionar um botão flutuante (`fixed bottom-5 left-5 z-40`) com ícone SVG do WhatsApp, cor `#25D366`, `rounded-full`, sombra
3. Visível apenas se `organization?.whatsapp` existir e checkout/item drawer estiverem fechados
4. `onClick` → `openWhatsAppWithFallback(`https://wa.me/55${org.whatsapp}?text=Olá! Gostaria de tirar uma dúvida sobre a loja. Pode me ajudar?`)`

### Resultado visual
```text
[Página da loja]
                                    [🛒 Carrinho → canto direito]
[💬 WhatsApp → canto esquerdo]
```

### Arquivo modificado
| Arquivo | Mudança |
|---------|---------|
| `src/pages/UnitPage.tsx` | Adicionar FAB flutuante de WhatsApp no canto inferior esquerdo |

