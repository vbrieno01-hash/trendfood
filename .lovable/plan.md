

# Secao "Indique o TrendFood" - compartilhamento simples

## Resumo

Adicionar uma secao simples no SettingsTab para o usuario compartilhar o link do TrendFood com outras pessoas. Sem recompensas, sem rastreamento, sem tabelas novas. Apenas um convite para divulgar a plataforma.

## Mudancas

### 1. Nenhuma alteracao no banco de dados

Nao precisa de tabela `referrals`, funcoes SQL, nem nada no backend. E apenas um link de compartilhamento da landing page.

### 2. `src/components/dashboard/SettingsTab.tsx`

Adicionar uma nova secao "Indique o TrendFood" entre a secao de Assinatura e a de Alterar Senha:

- Icone de compartilhamento (Share2 ou Heart do lucide-react)
- Texto curto: "Gostou do TrendFood? Compartilhe com outros empreendedores!"
- Link para copiar: `https://trendfood.lovable.app` (URL publicada do projeto)
- Botao "Copiar link" que copia para a area de transferencia e mostra toast de confirmacao
- Botao "Compartilhar via WhatsApp" que abre `https://wa.me/?text=...` com mensagem pre-formatada tipo: "Conhece o TrendFood? Sistema completo pra lanchonete! trendfood.lovable.app"

Visual seguindo o mesmo padrao de cards arredondados (`rounded-xl border border-border`) ja usado nas outras secoes da pagina.

