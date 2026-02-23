

## Correção: APK fecha ao selecionar foto (crash no upload de imagem)

### Diagnóstico

No Android, quando o `<input type="file">` abre a câmera ou galeria, o sistema pode destruir a Activity do WebView para liberar memória. Ao voltar, o app reinicia do zero -- perdendo o estado do formulário e do modal.

Além disso, as funções de upload não têm tratamento de erro adequado, causando crashes silenciosos.

### Correções planejadas

#### 1. `src/components/dashboard/MenuTab.tsx`
- Adicionar `try/catch` no `handleSubmit` para evitar crash silencioso ao salvar item com imagem
- Adicionar feedback de erro no `handleImageChange` quando o arquivo for grande demais (hoje falha silenciosamente)
- Resetar o `fileRef.current.value` após selecionar arquivo para evitar bug de re-seleção

#### 2. `src/components/dashboard/StoreProfileTab.tsx`
- Adicionar `try/catch` mais robusto nos handlers de upload de logo e banner
- Resetar input file após erro

#### 3. `capacitor.config.ts`
- Adicionar configuração `android.webContentsDebuggingEnabled: true` para debug
- Adicionar `server.androidScheme: "https"` que melhora a estabilidade do WebView com file inputs

#### 4. `android/app/src/main/AndroidManifest.xml` (instrução manual)
- O usuário precisará adicionar `android:configChanges="orientation|screenSize|keyboardHidden"` na Activity principal no Android Studio para prevenir que o Android destrua a Activity ao abrir câmera/galeria

---

### Detalhes técnicos

**MenuTab.tsx -- handleSubmit com try/catch:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    if (editItem) {
      await updateMutation.mutateAsync({ id: editItem.id, input: form });
    } else {
      await addMutation.mutateAsync(form);
    }
    setModalOpen(false);
  } catch (err) {
    console.error("[MenuTab] Submit error:", err);
    // toast já é tratado pelo mutation onError
  }
};
```

**MenuTab.tsx -- handleImageChange com feedback:**
```typescript
const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  try {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Foto muito grande", description: "Máximo 5MB.", variant: "destructive" });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setForm((p) => ({ ...p, imageFile: file }));
    setImagePreview(URL.createObjectURL(file));
  } catch (err) {
    console.error("[MenuTab] Image select error:", err);
    toast({ title: "Erro ao selecionar foto", variant: "destructive" });
  }
};
```

**capacitor.config.ts -- melhorar estabilidade WebView:**
```typescript
const config: CapacitorConfig = {
  appId: "app.trendfood.delivery",
  appName: "TrendFood",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  // ... plugins
};
```

### Após a correção

Rodar no terminal:
```
cd trendfood
git pull
npm install
npm run build
npx cap sync
npx cap open android
```

No Android Studio, antes de gerar o APK:
1. Abrir `android/app/src/main/AndroidManifest.xml`
2. Na tag `<activity>` principal, adicionar: `android:configChanges="orientation|screenSize|keyboardHidden"`
3. Gerar APK normalmente

