
# Trocar texto da indicacao no WhatsApp

## Resumo

Atualizar a mensagem de compartilhamento via WhatsApp nos dois locais onde ela aparece.

## Mudancas

### 1. `src/pages/DashboardPage.tsx` (linha 380)

Trocar a mensagem de:
> "Conhece o TrendFood? Sistema completo pra lanchonete, restaurante e delivery! Confira: https://trendfood.lovable.app"

Para:
> "Cansado de perder tempo anotando pedido no papel? 📝 Conheça o TrendFood: o sistema que vai agilizar sua cozinha e organizar seu delivery em poucos cliques. 🚀\n\nConfira como funciona: https://trendfood.lovable.app"

### 2. `src/components/dashboard/SettingsTab.tsx` (linha 163)

Mesma troca - de:
> "Conhece o TrendFood? Sistema completo pra lanchonete! 🍔🚀 https://trendfood.lovable.app"

Para:
> "Cansado de perder tempo anotando pedido no papel? 📝 Conheça o TrendFood: o sistema que vai agilizar sua cozinha e organizar seu delivery em poucos cliques. 🚀\n\nConfira como funciona: https://trendfood.lovable.app"

### Nenhuma outra alteracao

Apenas o texto da mensagem muda. Nada no banco, estilo ou logica.
