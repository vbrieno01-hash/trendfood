

## PDF Profissional de Novidades com "Antes e Depois"

### O que será feito
Gerar um PDF profissional, bem desenhado, com as 5 melhorias recentes do TrendFood, incluindo mockups visuais de "antes e depois" gerados programaticamente (já que o usuário não tem as imagens).

### Design do PDF
- **Formato**: A4, múltiplas páginas, layout moderno
- **Paleta**: Laranja TrendFood (#F07D00), cinza escuro (#1A1A1A), branco, tons neutros
- **Tipografia**: Limpa, hierarquia clara com títulos grandes e descrições concisas
- **Estilo**: Cards com bordas arredondadas, ícones via emojis, sombras sutis

### Estrutura (5-6 páginas)

1. **Capa** — Logo/nome TrendFood + "Novidades da Plataforma" + data + visual impactante
2. **Busca rápida na sidebar** — Antes (menu longo sem filtro) vs Depois (campo de busca com resultados filtrados) — mockup desenhado com reportlab
3. **Edição de pedidos** — Antes (cancelar e refazer) vs Depois (editar inline com ícone de lápis) — mockup do dialog
4. **Pedidos de Balcão** — Antes (label "Entrega" errado) vs Depois (label "Balcão" correto) — mockup de cards de pedido
5. **Mover categoria rápido** — Antes (abrir formulário completo) vs Depois (popover de 2 cliques) — mockup do card com popover
6. **Itens indisponíveis ocultos** — Antes (item com "Indisponível" visível) vs Depois (item sumiu da vitrine) — mockup da vitrine

### Abordagem técnica
- Script Python com `reportlab` (Platypus + Canvas para os mockups)
- Mockups "antes/depois" desenhados programaticamente com retângulos, textos e cores simulando a UI real
- Fonte DejaVu (suporte a acentos e emojis) — verificar disponibilidade, fallback para Helvetica com encoding
- QA visual obrigatório: converter cada página para imagem e inspecionar

### Resultado
PDF de ~6 páginas em `/mnt/documents/novidades-trendfood-v2.pdf`, visualmente profissional, pronto para WhatsApp/Telegram.

