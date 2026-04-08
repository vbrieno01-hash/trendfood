

## Plano: Tornar a linha de pausa mais intuitiva

### Problema
A linha de pausa mostra dois campos de horário com labels "Abre" e "Fecha" (do cabeçalho da tabela), mas na verdade significam "Pausa das / até". O usuário configura pausa de 12:00 a 22:00 sem perceber que está errado, porque visualmente parece igual à linha principal.

### Alterações

**`src/components/dashboard/BusinessHoursSection.tsx`**

1. **Mudar os labels da linha de pausa** — em vez de reutilizar as colunas "Abre/Fecha", mostrar inline: `"Pausa das [HH:MM] até [HH:MM]"` como texto corrido, mais natural
2. **Validação visual** — se a pausa estiver fora do horário de funcionamento (break_from < from ou break_to > to), mostrar um aviso em vermelho: `"⚠ A pausa deve estar dentro do horário de funcionamento (HH:MM – HH:MM)"`
3. **Auto-corrigir ao adicionar pausa** — quando o usuário clica "+ Pausa", calcular o meio do expediente como default (ex: abre 08:00, fecha 17:40 → pausa 12:00–13:00, mas se abre 18:00 fecha 23:00 → pausa 20:00–21:00)

### Detalhes técnicos

- A linha de pausa deixa de usar `<td>` separados e passa a usar `<td colSpan={3}>` com layout inline: ícone ⏸ + "Pausa das" + input time + "até" + input time
- Validação: comparar `break_from >= from` e `break_to <= to` (considerando cross-midnight)
- O texto explicativo abaixo da tabela continua

### Impacto
- 1 arquivo alterado
- UX muito mais clara: "Pausa das 12:00 até 13:00" em vez de dois campos soltos

