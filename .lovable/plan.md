
# Remover o Botão "Ver Cardápio Demo"

## Problema

O botão "Ver Cardápio Demo" no Hero linka para `/unidade/burguer-da-hora`, um slug de demonstração que não existe no banco de dados. Clicar nele exibe um catálogo vazio ou página de erro — experiência ruim para visitantes.

Como a seção de demos já foi removida anteriormente, esse botão ficou "sobrando" e sem propósito real.

## Solução

Remover o botão secundário do Hero. O botão principal "Começar Grátis" já cobre o CTA principal e é suficiente para conduzir o visitante.

## Arquivo a modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/Index.tsx` | Remover o `<Button>` secundário com o Link para `/unidade/burguer-da-hora` |

O bloco a ser removido (em torno da linha 196–203):

```tsx
<Button
  size="lg"
  variant="outline"
  className="text-base border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent"
  asChild
>
  <Link to="/unidade/burguer-da-hora">Ver Cardápio Demo</Link>
</Button>
```

O `<div className="flex flex-col sm:flex-row gap-3 justify-center">` ao redor ficará apenas com o botão "Começar Grátis". Caso faça mais sentido visualmente, o container pode ser simplificado para um único botão centralizado.

## Impacto

- Zero quebra de layout (o botão principal permanece)
- Nenhuma nova dependência
- Visitantes não chegam mais em página vazia/com erro
