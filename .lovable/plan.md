

## Plano — Remover "JACKSON BRENO FRANCELINO DA COSTA" de todo o site

### Onde aparece atualmente

Busca no codebase encontra a string em:

1. `src/pages/Index.tsx` — footer da landing page
2. `src/pages/TermsPage.tsx` — footer
3. `src/components/checkout/TermsContent.tsx` — bloco final do conteúdo de termos
4. `src/pages/PrivacyPage.tsx` — footer

### O que será alterado

Em todos os 4 arquivos acima, substituir:

- **De:** `CNPJ 66.067.207/0001-91 — JACKSON BRENO FRANCELINO DA COSTA`
- **Para:** `CNPJ 66.067.207/0001-91`

(remover apenas o travessão e o nome; manter o CNPJ exatamente como está)

### Verificação adicional

Vou também rodar uma busca final por "Jackson", "Breno", "Francelino" e "COSTA" em todo o `src/` para garantir que não sobrou nenhuma ocorrência em outro componente, página ou config (ex: meta tags, SEO, sobre).

### Resultado esperado

- Footer da landing, página de Termos, conteúdo de Termos no checkout e página de Privacidade passam a exibir apenas o CNPJ
- Nome pessoal removido 100% do site
- Nenhuma outra alteração visual ou funcional

### Arquivos
- `src/pages/Index.tsx`
- `src/pages/TermsPage.tsx`
- `src/components/checkout/TermsContent.tsx`
- `src/pages/PrivacyPage.tsx`

