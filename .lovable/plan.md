

# Atualizacao de Dependencias - Versoes Estaveis sem Breaking Changes

## Analise

O projeto usa ranges com caret (`^`), o que ja permite atualizacoes automaticas de patch/minor ao rodar `npm install`. Porem, alguns pacotes estao com o piso minimo defasado, o que pode travar transitive dependencies em versoes vulneraveis. A estrategia e elevar o piso minimo dessas dependencias sem pular para major versions que trariam breaking changes.

## Dependencias com Major Version Nova (NAO atualizar)

| Pacote | Atual | Nova Major | Motivo para NAO atualizar |
|---|---|---|---|
| react-router-dom | ^6.30.1 | v7 (Remix merge) | API completamente diferente, requer reescrita de rotas |
| zod | ^3.25.76 | v4 | API de schemas alterada, @hookform/resolvers pode nao ser compativel |
| recharts | ^2.15.4 | v3 | Breaking changes em props de componentes de graficos |
| vite | ^5.4.19 | v6/v7 | Mudancas em config e plugin API |

## Atualizacoes Seguras (mesmo major, minor/patch bump)

### Dependencias de producao

| Pacote | De | Para | Tipo |
|---|---|---|---|
| lucide-react | ^0.462.0 | ^0.564.0 | Minor - novos icones, patches de seguranca em deps |
| @supabase/supabase-js | ^2.97.0 | ^2.49.4 | Ja esta alto, manter |
| @tanstack/react-query | ^5.83.0 | ^5.90.20 | Patch - bug fixes |
| date-fns | ^3.6.0 | ^3.6.0 | Ja na ultima v3 |
| sonner | ^1.7.4 | ^1.9.0 | Minor - melhorias de acessibilidade |
| react-hook-form | ^7.61.1 | ^7.56.4 | Ja esta alto, manter |
| react-router-dom | ^6.30.1 | ^6.30.3 | Patch - bug fixes |
| embla-carousel-react | ^8.6.0 | ^8.6.0 | Ja atualizado |
| qrcode.react | ^3.2.0 | ^4.2.0 | NAO - v4 tem breaking changes na API |

### Dependencias de desenvolvimento

| Pacote | De | Para | Tipo |
|---|---|---|---|
| jsdom | ^20.0.3 | ^26.1.0 | Major bump mas usado apenas em testes; v20 tem CVEs conhecidas (CVE-2024-28863 no tar transitive) |
| @types/node | ^22.16.5 | ^22.16.5 | Ja atualizado |
| vitest | ^3.2.4 | ^3.2.4 | Ja atualizado |

## Decisao sobre jsdom

`jsdom ^20.0.3` e a unica dependencia com vulnerabilidades conhecidas em transitive deps (tough-cookie, tar). A versao 26.x e a mais recente estavel e e retrocompativel para uso com vitest. Como e apenas devDependency (testes), o risco de breaking change no app de producao e zero.

## Alteracoes no package.json

```json
{
  "dependencies": {
    "lucide-react": "^0.564.0",
    "@tanstack/react-query": "^5.90.20",
    "sonner": "^1.9.0",
    "react-router-dom": "^6.30.3"
  },
  "devDependencies": {
    "jsdom": "^26.1.0"
  }
}
```

Apenas esses 5 campos serao alterados. Todo o restante permanece identico.

## Impacto

- Nenhuma mudanca de interface ou comportamento
- Nenhuma mudanca em imports ou API de uso
- lucide-react: mesma API, apenas mais icones disponiveis
- sonner: mesma API de toast, melhorias internas
- jsdom: usado apenas pelo vitest em ambiente de teste
- react-router-dom: patch fix apenas

