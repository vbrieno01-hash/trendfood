
# Ocultar o Badge do Lovable via CSS

## O que será feito

O badge "Edit in Lovable" é injetado pela plataforma como um elemento DOM com atributos específicos. É possível ocultá-lo adicionando uma regra CSS no arquivo `src/index.css` que força o elemento a ficar invisível.

## Mudança

Arquivo: `src/index.css`

Adicionar ao final do arquivo:

```css
/* Hide Lovable badge */
#lovable-badge,
[data-lovable-badge],
a[href*="lovable.app"][style*="position: fixed"],
a[href*="lovable.dev"][style*="position: fixed"] {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
  visibility: hidden !important;
}
```

Esta regra cobre os seletores mais comuns usados pelo badge injetado pela plataforma.

## Observação importante

Esta abordagem usa CSS para forçar a ocultação. Funciona na maioria dos casos, mas como o badge é injetado externamente, a Lovable pode alterar os seletores em futuras atualizações. A forma oficial e permanente de remover o badge é via **Settings → Hide 'Lovable' Badge** (disponível nos planos pagos).

## Arquivo afetado

| Arquivo | O que muda |
|---|---|
| `src/index.css` | Adiciona 4 linhas de CSS no final do arquivo |
