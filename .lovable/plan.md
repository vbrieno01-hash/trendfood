
# Melhorias no Painel do Motoboy

## Problemas identificados

1. **Link do WhatsApp**: A mensagem enviada ao cliente inclui `trendfood.lovable.app`, que leva para a pagina de cadastro da plataforma (para donos de loja), nao para o cardapio do cliente. O link correto deve ser o da unidade: `trendfood.lovable.app/unidade/SLUG`
2. **Sem opcao de logout**: O motoboy nao consegue sair da conta (trocar de motoboy ou limpar sessao)
3. **Botao Instalar**: Ja existe o botao de instalar PWA no header, mas so aparece quando o navegador oferece. Vamos manter e garantir visibilidade

## Alteracoes

### 1. Corrigir link do WhatsApp (CourierPage.tsx, linha 216)

Trocar `trendfood.lovable.app` por `trendfood.lovable.app/unidade/SLUG` para que o cliente acesse o cardapio da loja correta, nao a pagina de cadastro.

De:
```
Equipe *Loja* | trendfood.lovable.app
```

Para:
```
Equipe *Loja* | trendfood.lovable.app/unidade/slug-da-loja
```

### 2. Adicionar botao "Sair" no header (CourierPage.tsx)

Adicionar um botao "Sair" ao lado do nome do motoboy no header. Ao clicar:
- Remove o `courier_id` do localStorage
- Recarrega a pagina (volta para tela de cadastro/login)

### 3. Garantir botao "Instalar App" visivel

O botao PWA ja existe no header. Nenhuma alteracao necessaria, ja funciona.

---

## Detalhes tecnicos

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/CourierPage.tsx` (linha 216) | Trocar link de `trendfood.lovable.app` para `trendfood.lovable.app/unidade/${orgSlug}` |
| `src/pages/CourierPage.tsx` (header, ~linha 281) | Adicionar botao "Sair" que limpa localStorage e recarrega |
| `src/hooks/useCourier.ts` | Exportar funcao `clearCourierId()` para remover do localStorage |
