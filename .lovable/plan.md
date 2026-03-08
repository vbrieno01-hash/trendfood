

## Plano: Configurar dados de teste para o sistema de precificação

Operações de dados (não requerem migração):

### 1. Atualizar custo dos insumos

| Insumo | ID | Custo atual | Novo custo |
|--------|-----|------------|------------|
| Água | `da7d5314-...` | R$ 0,00 | R$ 1,50 |
| Refri (maiúsculo) | `b9663f60-...` | R$ 0,00 | R$ 3,50 |
| refri (minúsculo) | `487be5f5-...` | R$ 7,99 | manter |

### 2. Vincular ingredientes ao "Duplo cheddar" (`5dae79f7-...`)

Atualmente o Duplo cheddar não tem ingredientes vinculados. Vamos vincular os insumos existentes como exemplo:

- **Refri** (stock `b9663f60-...`) — quantity_used: 1

Nota: como só existem 3 insumos cadastrados (Água, Refri, refri), o vínculo será limitado. Para um teste mais realista, seria ideal cadastrar insumos como "Pão", "Hambúrguer", "Cheddar" primeiro.

### 3. Resultado esperado na aba Precificação

Após as alterações:
- "Duplo cheddar" mostrará custo total baseado nos ingredientes vinculados
- Margem será calculada: `(54,34 - custo) / 54,34 × 100`
- Preço sugerido aparecerá baseado no slider de markup

