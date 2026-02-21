
# Validacao de placa no cadastro de motoboy

## Resumo
Adicionar validacao no campo "Placa da moto" para limitar a 7 caracteres (formato brasileiro) e aceitar apenas letras e numeros. O campo ja converte para maiusculo automaticamente.

## O que muda

### Arquivo: `src/pages/CourierPage.tsx`
1. Adicionar `maxLength={7}` no Input da placa para impedir digitacao alem de 7 caracteres
2. No `onChange` da placa, filtrar caracteres invalidos (aceitar apenas A-Z e 0-9) usando regex `.replace(/[^A-Za-z0-9]/g, "")`
3. Antes de submeter o formulario, validar que a placa tem exatamente 7 caracteres e segue o padrao brasileiro (3 letras + 1 numero + 1 letra ou numero + 2 numeros). Se invalida, mostrar toast de erro e nao enviar
4. Adicionar texto auxiliar abaixo do campo: "Formato: ABC1D23 (7 caracteres)"

### Validacao aceita
- Formato antigo: `ABC1234` (3 letras + 4 numeros)
- Formato Mercosul: `ABC1D23` (3 letras + 1 numero + 1 letra + 2 numeros)

### Regex de validacao
```text
/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/
```
Cobre ambos os formatos em uma unica expressao.
