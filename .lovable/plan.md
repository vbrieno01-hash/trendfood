

## Diagnóstico — `StorageUnknownError: Failed to fetch` no upload de foto

Esse erro **não é um bug de código** nem de permissão. É erro de **rede no upload da foto pra Lovable Cloud Storage**, e acontece em 3 cenários típicos no celular:

1. **Foto grande + internet fraca** — câmera de Android moderno gera fotos de 8-15MB. Mesmo com compressão, o upload pode demorar 20-40s no 4G ruim. Se a conexão piscar, o `fetch` morre com "Failed to fetch".
2. **Compressão falhou silenciosamente** — `compressImage` tem fallback: se der erro (iPhone com HEIC, pouca memória, foto enorme), ele **manda o arquivo original sem comprimir**. Aí sobe 12MB pelo 4G e quebra.
3. **Sem retry** — hoje uma única falha de rede já mostra o erro. Sem segunda tentativa, sem reprocessamento.

A configuração do bucket está correta (público, sem limite de tamanho rígido), e as policies estão certas. O problema é **resiliência do upload no celular**.

## Plano de correção — 3 camadas de blindagem

### 1. Compressão mais agressiva e garantida

Em `src/lib/compressImage.ts`:
- Reduzir `maxWidth/maxHeight` padrão de 1200 pra **1024** (suficiente pra cards do cardápio, ainda nítido).
- Reduzir `quality` padrão de 0.8 pra **0.75**.
- Se a primeira tentativa de compressão **falhar** ou se o arquivo ainda ficar grande (>1.5MB depois da compressão), tentar **uma segunda passada** com `maxWidth=800` e `quality=0.65` antes de cair no fallback do arquivo original.
- Resultado esperado: foto de 12MB sai como ~150-300KB. Upload em 1-2s mesmo no 4G ruim.

### 2. Retry automático com backoff no upload

Em `src/hooks/useMenuItems.ts`, função `uploadMenuImage`:
- Envolver o `supabase.storage.upload()` em uma rotina de **3 tentativas** com espera crescente (1s, 2s, 4s).
- Detectar especificamente `TypeError: Failed to fetch` / `StorageUnknownError` e fazer retry. Outros erros (permissão, mime inválido) não retentam.
- Toast de progresso melhor: ao invés de só "Erro ao salvar item", mostrar **"Falha de conexão ao enviar a foto. Tente novamente em uma rede melhor ou use uma foto menor."**

### 3. Aplicar a mesma blindagem no upload de logo e banner

Em `src/components/dashboard/StoreProfileTab.tsx` (`handleLogoUpload` e `handleBannerUpload`):
- Reusar o mesmo wrapper de retry.
- Mensagem de erro amigável idêntica.

## Arquivos afetados

- `src/lib/compressImage.ts` — compressão mais agressiva + segunda passada
- `src/hooks/useMenuItems.ts` — wrapper de retry no `uploadMenuImage`
- `src/components/dashboard/StoreProfileTab.tsx` — usar o mesmo wrapper pro logo/banner
- `src/components/dashboard/MenuTab.tsx` — toast de erro mais explicativo

## Resultado esperado

- Fotos de câmera ficam <300KB antes de subir → upload rápido até no 3G
- Se a rede piscar, o sistema tenta de novo automaticamente 2x antes de desistir
- Quando realmente falhar, o lojista entende **o que** deu errado e **o que fazer** ("internet ruim, troque de rede ou use foto menor"), não fica olhando "Failed to fetch" sem entender

