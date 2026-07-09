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