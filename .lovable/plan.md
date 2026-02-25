

# Plano: Afastar o botão do menu hambúrguer da borda superior

## Problema
Em dispositivos com tela "infinita" (edge-to-edge), o botão de menu hambúrguer (☰) fica muito próximo da borda superior da tela. Ao tocar nele, o sistema interpreta como gesto de puxar as notificações do próprio dispositivo, em vez de abrir o menu lateral do app.

## O que será feito

### Atualizar `src/pages/DashboardPage.tsx`

**Linha 781** — Header mobile:
- Aumentar o padding vertical do header de `py-3` para `py-4 pt-[env(safe-area-inset-top,12px)]`
- Isso usa a variável CSS `safe-area-inset-top` que os navegadores mobile expõem para evitar a área de notificações do sistema
- Em dispositivos sem safe-area, aplica um mínimo de 12px de margem superior

### Atualizar `index.html`

- Adicionar a meta tag `viewport-fit=cover` ao viewport existente, para que o browser informe corretamente os safe-area insets:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  ```

## Seção técnica
```text
Arquivos: 2
- src/pages/DashboardPage.tsx (linha 781): py-3 → py-4 pt-[env(safe-area-inset-top,12px)]
- index.html: adicionar viewport-fit=cover na meta viewport
```

