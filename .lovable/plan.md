## O que vai ser feito

Criar uma nova aba **"Capacidade"** no painel admin (`/admin`) que mostra em tempo real:

### 1. Uso atual da plataforma
- **Usuários** cadastrados (auth.users)
- **Lojas** totais, divididas por plano (Free / Pro / Enterprise / Lifetime / Trial ativo)
- **Pedidos** totais e nos últimos 30 dias
- **Tamanho do banco** (MB usados) com barra de progresso vs. limite da instância atual

### 2. Capacidade por plano (tabela de referência)
Como o Lovable Cloud é **usage-based** (não tem "X usuários por plano"), a tabela vai mostrar limites práticos por **tamanho de instância** do banco:

| Instância | RAM | Banco confortável | Lojas estimadas* | Pedidos/mês* |
|-----------|-----|-------------------|------------------|--------------|
| Pico (atual) | 0.5 GB | até ~500 MB | ~30-50 | ~10k |
| Micro | 1 GB | até ~1 GB | ~100 | ~30k |
| Small | 2 GB | até ~4 GB | ~300 | ~100k |
| Medium | 4 GB | até ~8 GB | ~800 | ~300k |

*Estimativas baseadas no consumo médio atual (~10 MB por loja ativa, ~140 KB por pedido)

### 3. Alertas inteligentes
- Banner vermelho se banco passar de **80%** da capacidade da instância
- Banner amarelo se passar de **60%**
- Sugestão de upgrade com link direto para Cloud → Advanced settings

### 4. Como vou buscar os dados
Criar uma função SQL `get_platform_capacity_stats()` (SECURITY DEFINER, restrita a admin) que retorna em uma única chamada:
- `pg_database_size()` em bytes
- contagens de orgs por plano
- contagem de auth.users
- contagem de pedidos total e últimos 30 dias
- tamanho das maiores tabelas (top 5)

A aba consulta essa função a cada 30 segundos (React Query) para sentir "tempo real" sem martelar o banco.

### Sobre as imagens (sua segunda pergunta)
Já está implementado e funcionando:
- **Logos**: comprimidos para 800x800 máx
- **Banners**: 1200x800 máx
- **Cardápio**: mesmo pipeline
- Segundo passe automático se ainda passar de um limite

Vou só **adicionar um card** no novo painel mostrando o tamanho total ocupado pelos buckets (`logos`, `menu-images`, `site-images`) pra você visualizar quanto espaço de imagem está sendo usado.

## Arquivos que serão criados/editados

- **Novo:** `supabase/migrations/<timestamp>_capacity_stats.sql` — função `get_platform_capacity_stats()` + função `get_storage_buckets_size()`
- **Novo:** `src/components/admin/CapacityTab.tsx` — UI da aba com cards, tabela de planos e alertas
- **Editado:** `src/pages/AdminPage.tsx` — adicionar nova aba "Capacidade" no menu admin

## Observações técnicas

- A função SQL precisa ser `SECURITY DEFINER` com `WHERE has_role(auth.uid(), 'admin')` no início para garantir que só o admin (`brenojackson30@gmail.com`) acesse.
- Os "limites" de cada instância são **estimativas práticas**, não limites rígidos do Supabase — vou deixar isso explícito na UI pra não criar expectativa errada.
- Não vou criar nenhum cron novo; é tudo on-demand.
