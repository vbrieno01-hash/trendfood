export type AppUpdate = {
  id: string;
  title: string;
  description: string;
  chips?: string[];
  ctaLabel?: string;
  ctaTab?: string;
  publishedAt: string;
  expiresAt: string;
  icon?: "wallet" | "bell" | "sparkles" | "chart";
};

export const APP_UPDATES: AppUpdate[] = [
  {
    id: "migration-vps-2026-07",
    title: "Migração de servidor em andamento — pode ter lentidão.",
    description:
      "Estamos movendo o TrendFood pra uma **VPS mais potente** pra melhorar velocidade, estabilidade e suportar o crescimento da plataforma. Durante os **próximos 3 a 4 dias** você pode sentir alguma **lentidão pontual** ou breves reconexões. **Nenhum pedido, cliente ou configuração será perdido** — está tudo em backup redundante. Obrigado pela paciência! 🚀",
    chips: [
      "Sem perda de dados",
      "Duração estimada: 3-4 dias",
      "Servidor mais rápido no fim",
    ],
    publishedAt: "2026-07-16",
    expiresAt: "2026-07-22",
    icon: "bell",
  },
  {
    id: "cash-control-v3",
    title: "Controle de Caixa profissional chegou.",
    description:
      "Feche cada turno com **cupom Z impresso**, exporte planilha do dia, veja **ranking de operadores** e gráficos de divergência. Zero adivinhação — cada centavo do seu caixa agora tem rastro.",
    chips: [
      "Cupom Z automático",
      "Comparativo por turno",
      "Auditoria à prova de fraude",
    ],
    ctaLabel: "Abrir Caixa",
    ctaTab: "caixa",
    publishedAt: "2026-07-09",
    expiresAt: "2026-07-30",
    icon: "wallet",
  },
];