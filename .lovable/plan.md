

## Plano — Tornar a aba "Logs de Erro" útil pra você

### O problema real

A aba existe em **Painel Admin → Logs de Erro**, mas hoje ela mostra coisas como:

> `TypeError: null is not an object (evaluating 'be.target')`

E você fica olhando sem saber:
- **O que isso significa?**
- **Algum cliente foi afetado?**
- **Preciso agir agora ou posso ignorar?**

Isso é inútil. Vou transformar essa tela em algo que **fala português** e te diz o que importa.

### Onde fica (pra você achar agora)

1. Acesse o **Painel Admin** (ícone no menu lateral, só visível pra você)
2. Procure a aba **"Logs de Erro"** (ícone de alerta vermelho ⚠️)
3. Hoje você vê uma tabela técnica. Vou transformá-la.

### O que vai mudar na tela

**1. Cards de resumo no topo (linguagem humana)**

Em vez de tabela direto, abre com 4 cards grandes:

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│   🟢 Saúde      │   🔴 Críticos   │   🟡 Atenção    │   ⚪ Ignoráveis │
│    98.5%        │       0         │       3         │       12        │
│  Tudo certo     │ Nenhum cliente  │ Painel admin    │ Ruído de        │
│                 │ afetado         │ travou 3x       │ tracker (ok)    │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

**2. Cada erro vira um cartão com tradução em português**

Em vez de:
> `TypeError: null is not an object (evaluating 'be.target')`

Vai aparecer:
> 🟡 **Campo do checkout travou no iPhone**
> Aconteceu 5x nos últimos 7 dias. Cliente provavelmente recarregou e funcionou.
> **O que é:** bug conhecido do Safari iOS quando o usuário cola texto rápido.
> **Impacto:** baixo — não impede pedido.
> **Ação sugerida:** já tem fix planejado, pode aguardar.

**3. Classificação automática por gravidade**

Cada erro entra numa de 3 categorias:
- 🔴 **Crítico** — afetou pedido, pagamento ou impressão (precisa agir AGORA)
- 🟡 **Atenção** — afetou painel admin/dashboard (lojista viu tela de erro mas se recuperou)
- ⚪ **Ignorável** — ruído de tracker, extensão de navegador, bot (zero ação)

**4. Filtro padrão "Só o que importa"**

Por padrão, esconde os ignoráveis. Botão "Ver tudo" mostra os 100% caso queira investigar.

**5. Botão "Marcar como resolvido"**

Quando você corrigir um erro, clica e ele some da lista. Se voltar a aparecer, reaparece destacado como "Voltou!".

### Como vou traduzir os erros

Vou criar um **dicionário de padrões conhecidos** no código (`src/lib/errorClassifier.ts`):

| Padrão técnico | Tradução humana | Gravidade |
|---|---|---|
| `e.target` is null | Campo do checkout travou no iPhone | 🟡 Atenção |
| `Failed to fetch dynamically imported module` | Lojista com versão velha em cache | ⚪ Ignorável (auto-resolve) |
| `Should have a queue` / `Rendered more hooks` | Tela do dashboard travou | 🟡 Atenção |
| `Script error.` | Erro de tracker do anúncio | ⚪ Ignorável |
| Erro em `/checkout` ou `placeOrder` | **Cliente não conseguiu pagar** | 🔴 Crítico |
| Erro em `printOrder` ou `fila_impressao` | **Pedido não imprimiu** | 🔴 Crítico |
| Qualquer outro | Erro novo, investigar | 🟡 Atenção |

Erros desconhecidos entram como "Atenção" com um botão **"Marcar como ignorável"** — você ensina o sistema com um clique.

### O que NÃO vou mexer

- A coleta de erros (`errorLogger.ts`) continua igual
- A tabela `client_error_logs` no banco fica intacta
- O `ErrorBoundary` continua funcionando como hoje
- Zero risco de regressão na vitrine, checkout ou dashboard

### Resultado esperado

- Você abre a aba e em **5 segundos** sabe se tem incêndio ou não
- Cada erro tem **tradução em português + ação sugerida**
- Para de olhar pra `be.target null` sem entender nada
- Erros realmente críticos (pagamento/impressão) **gritam em vermelho**

### Arquivos
- `src/lib/errorClassifier.ts` (novo — dicionário de padrões + tradução)
- `src/components/admin/ErrorLogsTab.tsx` (UI nova com cards de resumo + cartões traduzidos)

