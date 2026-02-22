

# Paginacao nas listas da aba Motoboys

## Problema
A aba de motoboys fica muito longa com muitas entregas e motoboys, obrigando o usuario a rolar infinitamente.

## Solucao
Adicionar botoes "Ver mais" / "Ver menos" (estilo balao) em cada lista, mostrando apenas os primeiros itens e expandindo sob demanda. Isso se aplica a 3 listas:

1. **Entregas ativas** - mostrar no maximo 3, com botao "Ver mais X entregas"
2. **Concluidas / Canceladas** - mostrar no maximo 3, com botao "Ver mais X entregas"
3. **Motoboys cadastrados** - mostrar no maximo 5, com botao "Ver mais X motoboys"

## Como vai funcionar

- Cada lista exibe um limite inicial (3 ou 5 itens)
- Se houver mais itens, aparece um botao estilizado abaixo da lista: "Ver mais X itens"
- Ao clicar, expande para mostrar todos
- Quando expandido, mostra botao "Ver menos" para recolher
- Visual do botao: arredondado, com icone ChevronDown/ChevronUp, estilo outline discreto (semelhante ao balao da imagem de referencia)

## Alteracao tecnica

### Arquivo: `src/components/dashboard/CourierDashboardTab.tsx`

- Adicionar 3 estados: `showAllActive`, `showAllCompleted`, `showAllCouriers` (todos iniciam `false`)
- Para cada lista, fazer slice no array antes de renderizar (ex: `activeDeliveries.slice(0, showAllActive ? undefined : 3)`)
- Abaixo de cada lista, renderizar o botao "Ver mais / Ver menos" condicionalmente quando `array.length > limite`
- Componente do botao reutilizado inline, com icones `ChevronDown` / `ChevronUp` (ja importados)

Nenhum arquivo novo, nenhuma migracao necessaria.

