

## Plano: Atualização Institucional, PDF e Termos de Uso

### O que já está implementado
- Limite de faturamento mensal nas Configurações + barra de progresso no Dashboard ✅
- Cláusula de responsabilidade fiscal nos Termos ✅
- Resumo por meio de pagamento no PDF ✅

### O que precisa ser feito

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `src/pages/Index.tsx` | Adicionar CNPJ e razão social no footer: "66.067.207/0001-91 - JACKSON BRENO FRANCELINO DA COSTA" |
| 2 | `src/pages/TermsPage.tsx` | Adicionar CNPJ no footer |
| 3 | `src/pages/PrivacyPage.tsx` | Adicionar CNPJ no footer |
| 4 | `src/components/dashboard/ReportsTab.tsx` | Adicionar rodapé fixo em todas as páginas do PDF: "Este é um relatório gerencial. A emissão de documentos fiscais e o controle de limites tributários são de responsabilidade exclusiva do estabelecimento." |
| 5 | `src/components/dashboard/SettingsTab.tsx` | Renomear seção de billing para "Gestão Fiscal" com ícone atualizado |
| 6 | `src/components/checkout/TermsContent.tsx` | Reescrever termos enfatizando: TrendFood é SaaS, não retém valores, não processa pagamentos, não é responsável por contabilidade/impostos |

### Detalhes

**1. Footer institucional (Index.tsx)** — Abaixo do copyright, adicionar linha com CNPJ e razão social. Links para Termos e Privacidade já existem.

**2-3. Footers das páginas de Termos e Privacidade** — Substituir "© 2025 TrendFood" por texto com CNPJ + razão social.

**4. Rodapé no PDF** — No `buildReportHtml`, adicionar CSS `@bottom-center` para impressão e um `<div class="footer">` fixo com o aviso legal. Para o PNG (html2canvas), o footer já aparece no final do documento.

**5. Gestão Fiscal** — Apenas renomear o header da seção de "Saúde Fiscal" para "Gestão Fiscal" e ajustar o texto explicativo para incluir menção a CPF/MEI/ME.

**6. Termos de Uso** — Reescrever com ênfase em:
- TrendFood é plataforma SaaS de gestão de pedidos
- Não retém valores — dinheiro vai direto para o lojista
- Não processa pagamentos (Pix do lojista, maquininha do lojista)
- Não é responsável por contabilidade, impostos ou obrigações fiscais
- Manter cláusulas existentes (reembolso, planos, LGPD)

### Resultado
- 6 arquivos editados, 0 migrações
- Footer institucional com CNPJ em todas as páginas públicas
- PDF com disclaimer legal no rodapé
- Termos reforçados juridicamente

