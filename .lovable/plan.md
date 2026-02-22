
# Criar páginas de Termos de Uso e Política de Privacidade

## O que será feito

Criar duas páginas completas com conteúdo jurídico genérico adaptado para um SaaS de alimentação (TrendFood), e atualizar os links no footer.

## Páginas

### 1. Termos de Uso (`/termos`)
Conteúdo cobrindo:
- Aceitação dos termos
- Descrição do serviço (plataforma de gestão para food service)
- Cadastro e responsabilidades do usuário
- Planos e pagamentos
- Propriedade intelectual
- Limitação de responsabilidade
- Rescisão e cancelamento
- Alterações nos termos
- Foro e legislação aplicável (Brasil)

### 2. Política de Privacidade (`/privacidade`)
Conteúdo cobrindo:
- Dados coletados (cadastro, uso da plataforma, cookies)
- Finalidade do tratamento (LGPD)
- Compartilhamento com terceiros
- Armazenamento e segurança
- Direitos do titular (acesso, correção, exclusão)
- Cookies e tecnologias similares
- Contato do encarregado (DPO)
- Alterações na política

## Arquivos

### Novos arquivos
- `src/pages/TermsPage.tsx` - Página de Termos de Uso
- `src/pages/PrivacyPage.tsx` - Página de Política de Privacidade

Ambas com layout limpo: header com logo + botão voltar, conteúdo em prosa com títulos e parágrafos, e footer simples. Estilo consistente com o resto do site.

### Arquivos modificados
- `src/App.tsx` - Adicionar rotas `/termos` e `/privacidade`
- `src/pages/Index.tsx` - Trocar os `href="#"` do footer por `Link to="/termos"` e `Link to="/privacidade"`

## Detalhes técnicos
- Páginas puramente estáticas (sem banco de dados)
- Usar `Link` do react-router-dom para navegação
- Importar logo da TrendFood no header de cada página
- Conteúdo em português brasileiro, tom profissional
- Data de vigência: fevereiro de 2025
