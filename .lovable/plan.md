

## Refazer PDF — Remover ícone e código copiável

### Problema
1. O ícone laranja com X na capa é desnecessário — remover.
2. O código CSS precisa ser copiável no PDF (usar texto real, não imagem).

### Alterações
- **Capa**: Remover o círculo/X. Manter apenas o título "REMOVER MARCA D'ÁGUA DO LOVABLE" e subtítulo centralizado no fundo escuro.
- **Página 2**: Manter as instruções com o bloco de código CSS como texto selecionável (reportlab Paragraph com fonte monospace), garantindo que seja copiável.
- Gerar novo arquivo `Remover_Badge_Lovable_v2.pdf` em `/mnt/documents/`.
- QA visual obrigatório após geração.

