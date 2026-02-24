

## Plano: Adicionar footer na pagina publica da loja

### O que sera feito
Adicionar um rodape (footer) no final da pagina publica da loja (`UnitPage.tsx`) com informacoes sobre o TrendFood, similar ao exemplo da imagem de referencia. O footer ficara entre o `</main>` e o carrinho flutuante.

### Conteudo do footer
- Logo/nome "TrendFood"
- Texto "Plataforma de cardapio digital e gestao para food service"
- Link para o site principal (/)
- Texto "Feito com TrendFood" e ano atual

### Alteracao

**Arquivo: `src/pages/UnitPage.tsx`**

Inserir um bloco `<footer>` apos a tag `</main>` (linha 766), antes do floating cart bar (linha 768):

```tsx
{/* Footer */}
<footer className="bg-muted/50 border-t border-border mt-8 pb-36">
  <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 py-8 text-center space-y-2">
    <Link to="/" className="inline-flex items-center gap-2 text-primary font-bold text-lg hover:opacity-80 transition-opacity">
      <img src="/logo-trendfood.png" alt="TrendFood" className="w-6 h-6" />
      TrendFood
    </Link>
    <p className="text-muted-foreground text-xs">
      Plataforma de cardapio digital e gestao para food service
    </p>
    <p className="text-muted-foreground/60 text-[10px]">
      &copy; {new Date().getFullYear()} TrendFood. Todos os direitos reservados.
    </p>
  </div>
</footer>
```

- `pb-36` garante espaco para o carrinho flutuante nao cobrir o footer
- Usa o mesmo `max-w-2xl lg:max-w-5xl` dos demais containers
- Nenhum impacto no mobile (responsivo por padrao)

