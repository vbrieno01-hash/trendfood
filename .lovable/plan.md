

## Diagnóstico e Correções para o APK

Dois bugs identificados no APK Android, ambos causados por limitações do WebView nativo.

---

### Bug 1: Upload de Foto reinicia o modal

**Causa raiz**: No Android, quando o WebView abre a galeria/câmera, a Activity pode ser destruída e recriada (mesmo com `configChanges`). O `<input type="file">` perde a referência e o evento `onChange` nunca dispara — o modal volta ao estado inicial sem a foto selecionada.

**Correção**: Substituir o `<input type="file">` por uma abordagem usando a **Capacitor Camera API** (`@capacitor/camera`) quando rodando no APK nativo. Isso evita a destruição da Activity e retorna a foto diretamente via bridge nativo. No navegador web, mantém o input file normal.

Mudanças:
- Instalar `@capacitor/camera`
- No `MenuTab.tsx`, detectar se está rodando no Capacitor (`Capacitor.isNativePlatform()`)
- Se nativo: usar `Camera.getPhoto()` que retorna a imagem como base64/URI sem sair da Activity
- Converter o resultado para `File` para manter compatibilidade com o fluxo de upload existente
- Se web: manter o `<input type="file">` atual

---

### Bug 2: Download de Relatórios não funciona

**Causa raiz (PNG)**: O `html2canvas` com iframe oculto não funciona no WebView do Android — o iframe não renderiza corretamente e o `canvas.toDataURL()` + `link.click()` não dispara download no WebView.

**Causa raiz (PDF)**: O `window.open("", "_blank")` abre o navegador externo (Chrome) com uma página em branco. O `window.print()` não funciona como esperado. Quando o usuário volta ao app, a Activity foi destruída e o APK fecha.

**Correção**: No ambiente nativo (Capacitor), usar uma abordagem diferente:
- **PNG**: Renderizar o HTML do relatório diretamente no DOM (div oculta), usar `html2canvas` nessa div (sem iframe), converter para blob, e usar `Capacitor Filesystem + Share` para salvar/compartilhar a imagem
- **PDF**: Em vez de `window.open`, renderizar o HTML na mesma página em um modal fullscreen com botão de voltar, e oferecer opção de compartilhar via `Share API` do Capacitor
- No web, manter o comportamento atual

Mudanças:
- Instalar `@capacitor/filesystem` e `@capacitor/share`
- No `ReportsTab.tsx`, detectar plataforma nativa
- `handleDownloadImage`: renderizar HTML em div oculta no DOM → `html2canvas` → `Filesystem.writeFile()` → `Share.share()` com o arquivo
- `handleDownloadPDF`: abrir modal fullscreen com o relatório renderizado + botão "Voltar" + botão "Compartilhar" (usa `Share.share()` ou `window.print()` via InAppBrowser)

---

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `package.json` | Adicionar `@capacitor/camera`, `@capacitor/filesystem`, `@capacitor/share` |
| `src/components/dashboard/MenuTab.tsx` | Lógica de câmera nativa via Capacitor Camera API |
| `src/components/dashboard/ReportsTab.tsx` | Download PNG via Filesystem+Share; PDF via modal in-app |

### Nota importante

Após implementar, será necessário rodar `npx cap sync` no projeto local para sincronizar os plugins nativos com o Android.

