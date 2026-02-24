

## Enriquecer o Footer da Landing Page

### O que muda

**Arquivo: `src/pages/Index.tsx`**

1. **Adicionar IDs nas secoes da landing page** para que os links do footer funcionem como ancoras:
   - Secao "Problemas" -> `id="problemas"`
   - Secao "Como Funciona" -> `id="como-funciona"`
   - Secao "Funcionalidades" -> `id="funcionalidades"`
   - Calculadora -> `id="calculadora"`

2. **Adicionar mais links no footer**, distribuidos entre as colunas:

   **Produto** (adicionar):
   - Calculadora de Economia (ancora `#calculadora`)
   - Comparativo (ancora `#comparativo` - ja existe na ComparisonSection)

   **Suporte** (adicionar):
   - Central de Ajuda (link para o dashboard/guia ou ancora)
   - FAQ / Perguntas Frequentes (ancora ou link)

   **Contato** (adicionar):
   - Instagram com o handle visivel

3. **Atualizar o ano do copyright** de 2025 para 2026 (data atual).

### Resultado
Footer mais completo e profissional, com links uteis que levam o visitante para as secoes relevantes da pagina, facilitando a navegacao e passando mais credibilidade.
