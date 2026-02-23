
# Mascara automatica de telefone no cardapio online

## O que sera feito

Adicionar formatacao automatica no campo de telefone do checkout do cardapio online. Conforme o cliente digita, o numero sera formatado automaticamente no padrao brasileiro:

- Celular: `(11) 99999-0000` (11 digitos)
- Fixo: `(11) 3333-0000` (10 digitos)
- Parcial: `(11) 9999` (enquanto digita)

## Como vai funcionar

- O usuario digita apenas numeros e a mascara aplica parenteses, espaco e hifen automaticamente
- O valor armazenado internamente (`buyerPhone`) ja fica formatado para exibicao
- A validacao continua funcionando (verifica se tem conteudo alem da formatacao)
- O `maxLength` sera ajustado para 15 caracteres (tamanho maximo com mascara)

## Secao Tecnica

### Arquivo: `src/pages/UnitPage.tsx`

1. **Criar funcao de mascara** `formatPhone(value: string): string` no corpo do componente:
   - Remove tudo que nao e digito
   - Limita a 11 digitos
   - Aplica formatacao progressiva:
     - 0 digitos: vazio
     - 1-2 digitos: `(XX`
     - 3 digitos: `(XX) X`
     - 4-6 digitos (fixo parcial): `(XX) XXXX`
     - 7-10 digitos (fixo): `(XX) XXXX-XXXX`
     - 11 digitos (celular): `(XX) XXXXX-XXXX`

2. **Atualizar onChange** do campo telefone (linha ~921):
   - Aplicar `formatPhone` ao valor antes de salvar:
   ```
   onChange={(e) => { setBuyerPhone(formatPhone(e.target.value)); setPhoneError(false); }}
   ```

3. **Ajustar maxLength** de 20 para 15 (tamanho maximo da mascara com celular)

4. **Ajustar validacao** (linha ~272): usar `buyerPhone.replace(/\D/g,"").length < 10` em vez de `!buyerPhone.trim()` para garantir que o telefone tenha pelo menos 10 digitos (fixo completo)

Nenhuma mudanca no banco de dados.
