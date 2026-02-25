

# Plano: Colocar a nova logo no header da página inicial

O screenshot que você enviou mostra o header da landing page — onde aparece o logo pequeno ao lado de "TrendFood". Você quer colocar ali a mesma logo que acabou de enviar (a do dashboard).

## O que será feito

### Atualizar `src/pages/Index.tsx`
- Trocar o import de `logoIcon` (logo-icon.png) por `logoDashboard` (logo-dashboard.png)
- Isso afeta dois pontos: o header no topo e o footer no rodapé da página inicial

## O que NÃO muda
- A logo do dashboard continua igual (já foi trocada)
- Nenhuma funcionalidade é alterada

## Seção técnica
```text
Arquivos editados: 1 (Index.tsx — trocar import de logo-icon.png para logo-dashboard.png)
Linhas afetadas: 3 (import + header img + footer img)
```

