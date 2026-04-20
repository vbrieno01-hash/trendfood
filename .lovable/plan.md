

## Diagnóstico — por que dashboard ≠ loja

Capturei o PATCH real que o dashboard envia ao salvar (do log de network):

```json
"theme_config": {
  "gradient_color": "#1e293b",     ← salvou DEFAULT, não o branco que você setou
  "secondary_color": "#ff0000",    ← FANTASMA legado nunca limpo
  "accent_text_color": "#1e293b"   ← DEFAULT também
}
"primary_color": "#f97316"         ← LARANJA, mas você tinha setado preto!
```

Ou seja: **o dashboard está jogando fora o que você digita e salvando os defaults.** Por isso a loja mostra cores aleatórias (laranja+vermelho do `secondary_color` fantasma).

### Causas raiz (3 bugs combinados)

**Bug 1 — `value` do ColorField cai em fallback ao invés de mostrar o salvo**

Linha 606 do `StoreProfileTab.tsx`:
```js
value={themeConfig.gradient_color || themeConfig.secondary_color || "#1e293b"}
```

Se o `themeConfig.gradient_color` vier como string vazia `""` ou se o React inicializar antes do org carregar, cai no fallback `#1e293b`. O `<input type="color">` então renderiza essa cor — e na próxima edição você está editando a partir do fallback, não do valor real.

**Bug 2 — `useState` inicializa só uma vez, não atualiza quando `organization` muda**

Linhas 79-95:
```js
const [form, setForm] = useState({ primary_color: organization.primary_color, ... });
const [themeConfig, setThemeConfig] = useState<ThemeConfig>(organization.theme_config ?? {});
```

`useState(initialValue)` só usa o initial **na primeira renderização**. Se o componente montar com `organization` ainda parcialmente carregado, ou se outra aba/refetch atualizar `organization`, o form fica com valores antigos. Aí o autosave (que dispara a cada 1.5s — linha 175) salva os valores antigos por cima dos novos do banco. **Race condition clássica.**

**Bug 3 — `secondary_color` fantasma nunca é removido**

Quando você "migra" pra novos campos (`gradient_color`, `accent_text_color`), o `secondary_color` antigo continua no JSONB do banco. E ele é usado como fallback em vários lugares — então fica voltando como zumbi.

### Por que só agora deu vermelho

Você editou em sessão A (salvou branco). Aí abriu sessão B (talvez outra aba, ou após reload), o `useState` montou com cache stale do React Query, e o autosave de 1.5s sobrescreveu seu branco com o `secondary_color` legado vermelho.

## Plano de correção

### 1. Trocar `useState` por sincronização reativa com `organization`

Adicionar `useEffect` que atualiza `form` e `themeConfig` sempre que `organization.id` (ou `updated_at`) mudar — não só na montagem. Assim refetches do React Query reidratam o estado corretamente.

```js
useEffect(() => {
  setForm({ primary_color: organization.primary_color, ... });
  setThemeConfig(organization.theme_config ?? {});
}, [organization.id, organization.updated_at]);
```

### 2. Limpar o `secondary_color` fantasma na primeira edição

Quando o usuário abrir o tema a primeira vez E já tiver `gradient_color`/`accent_text_color` salvos, **deletar o `secondary_color`** do JSONB (não usar mais como fallback). Isso elimina o zumbi.

Migração leve em SQL pra todas as lojas que já têm os novos campos: remover `secondary_color` quando `gradient_color` E `accent_text_color` já existirem.

### 3. Eliminar o fallback duplo no `value` do ColorField

Os campos passam a usar **um valor único e estável**:
```js
value={themeConfig.gradient_color ?? "#1e293b"}
```

Sem `|| secondary_color`. Se a migração SQL rodou, não tem mais zumbi pra resgatar. Lojas antigas (sem os novos campos) recebem `#1e293b` como inicial visível, mas só salvam quando o usuário interagir — sem PATCH automático.

### 4. Travar o autosave até o estado estar sincronizado

Adicionar um ref `isHydrated` que só vira `true` após o `useEffect` de sincronização rodar. Autosave só dispara se `isHydrated === true`. Evita o autosave salvar lixo durante a hidratação inicial.

### 5. Reset visual do tema da TrendFood (sua loja)

Como já tem dados ruins salvos, fazer **um UPDATE direto no banco** pra limpar:
- `primary_color` = o que você quer (preto? confirmar)
- `theme_config` = só os 3 campos novos limpos, sem `secondary_color`

### 6. Adicionar botão "Resetar todo o tema" no dashboard

Pra qualquer lojista que se perdeu igual você. Limpa `theme_config = {}` e `primary_color = "#f97316"` (laranja default) em um clique.

## Arquivos a editar

- `src/components/dashboard/StoreProfileTab.tsx` — useEffect de sincronização, ref isHydrated, remover fallback `|| secondary_color` dos values, botão "Resetar tema"
- `src/pages/UnitPage.tsx` — remover fallback `|| secondary_color` (limpo via migração)
- **Migração SQL** — limpar `secondary_color` de todas as lojas que já têm os novos campos
- **Reset direto** — corrigir `theme_config` da TrendFood (`mcd`) com os valores que você quer

## Pergunta antes de implementar

Pra resetar a TrendFood corretamente: você quer **preto + branco no gradiente** (como configurou na imagem do dashboard), certo? E `accent_text_color` (preço) qual cor? Laranja `#ff8800` ou outro?

Ou prefere que eu **resete tudo pro default** (laranja `#f97316` sem gradiente) e você reconfigura do zero com os bugs corrigidos?

