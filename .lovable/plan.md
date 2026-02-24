

## Diagnóstico: Por que funciona no Perfil da Loja e não no Cardápio

A diferença é simples e reveladora:

**Perfil da Loja (StoreProfileTab):** O `<input type="file">` está diretamente na página, sem modal. Quando o Android pausa/retoma o WebView ao voltar da galeria, o componente continua montado e o input continua no DOM. O callback `onChange` dispara normalmente.

**Cardápio (MenuTab):** O `<input type="file">` está DENTRO do bloco `{modalOpen && <div>...</div>}`. Quando o Android retoma o WebView e qualquer coisa causa `modalOpen` voltar a `false` (remount, re-render, perda de estado), o modal some E o input some junto. O callback do file input nem consegue executar porque o elemento já foi destruído do DOM.

## Solução

Copiar exatamente o padrão do StoreProfileTab: mover o `<input type="file">` para FORA do modal, no nível raiz do componente. Assim ele sempre existe no DOM, independente do estado do modal.

### Mudanças em `src/components/dashboard/MenuTab.tsx`:

1. **Mover `<input ref={fileRef} type="file">` para fora do bloco condicional do modal**, colocando no final do componente (junto ao AlertDialog de delete, por exemplo). O input fica invisível (`className="hidden"`) mas sempre presente no DOM.

2. **Simplificar `handleImageChange`**: manter 100% síncrono (já está). Apenas guarda o File e cria preview local com `URL.createObjectURL`.

3. **Manter o botão "Adicionar foto" dentro do modal** chamando `fileRef.current?.click()` como já faz. A diferença é que o `fileRef` agora aponta para um input que está fora do modal.

4. **Remover o input file duplicado de dentro do modal**.

5. **Manter o upload diferido para o "Salvar"** (já implementado).

### Por que isso resolve definitivamente

- O `<input type="file">` nunca é destruído do DOM, mesmo que o modal feche momentaneamente
- O callback `onChange` sempre executa, porque o elemento existe
- É exatamente o mesmo padrão que funciona no Perfil da Loja
- Zero complexidade adicional — na verdade simplifica o código

### Detalhes técnicos

O problema raiz é que no Android, quando o usuário sai do app para a galeria, o WebView pode sofrer um ciclo de destroy/recreate. Se o `<input type="file">` está dentro de um bloco condicional (`{modalOpen && ...}`), ao recriar o componente com `modalOpen=false`, o input não existe no DOM quando o `onChange` tenta disparar. Movendo o input para o nível raiz, ele sobrevive a qualquer estado do modal.

