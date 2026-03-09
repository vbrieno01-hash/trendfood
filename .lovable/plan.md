
## Plano: Tornar WhatsApp obrigatório e remover alerta da página pública

### Entendimento
A página pública (UnitPage) mostra um aviso quando o lojista não configurou WhatsApp. O usuário quer:
1. **Remover esse aviso** da página pública — não deve aparecer para clientes
2. **Obrigar** os lojistas a cadastrarem WhatsApp — assim nunca terão lojas sem número

### Mudanças

| Arquivo | Mudança |
|---------|---------|
| **UnitPage.tsx** | Remover o bloco de alerta (linhas 1270-1278) que exibe "WhatsApp não configurado". Se não houver WhatsApp, simplesmente não mostrar o botão de envio |
| **StoreProfileTab.tsx** | Mudar label de "(opcional)" para "(obrigatório)" e adicionar validação no `handleSave` que impede salvar sem WhatsApp preenchido |
| **OnboardingWizard.tsx** | Adicionar campo WhatsApp no Step 1 (Nome/Emoji → Nome/Emoji/WhatsApp). Validar que está preenchido antes de avançar |

### Validação do WhatsApp
- Mínimo de 10 dígitos (DDD + número)
- Toast de erro se tentar salvar sem preencher

### Comportamento na Página Pública (pós-mudança)
- Se loja não tiver WhatsApp: O botão de checkout fica desabilitado ou não aparece
- Não será mais exibida a mensagem de erro para o cliente final
