export type SuggestionStatus = "pending" | "in_production" | "finished";

export interface Organization {
  id: string;
  slug: string;
  name: string;
  password: string; // In production: hashed in Supabase
  description: string;
  emoji: string;
}

export interface Suggestion {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  votes: number;
  status: SuggestionStatus;
  created_at: string;
}

// --- Mock data (ready to replace with Supabase queries) ---

export const organizations: Organization[] = [
  {
    id: "org-1",
    slug: "burguer-da-hora",
    name: "Burguer da Hora",
    description: "Os melhores burguers artesanais da cidade 🍔",
    emoji: "🍔",
    password: "1234",
  },
  {
    id: "org-2",
    slug: "pizza-feliz",
    name: "Pizza Feliz",
    description: "Pizzas artesanais com ingredientes frescos 🍕",
    emoji: "🍕",
    password: "abcd",
  },
];

export const suggestions: Suggestion[] = [
  {
    id: "s-1",
    organization_id: "org-1",
    name: "Burguer de Costela Defumada",
    description: "Com queijo cheddar derretido e cebola caramelizada no pão brioche",
    votes: 42,
    status: "pending",
    created_at: "2025-02-10T10:00:00Z",
  },
  {
    id: "s-2",
    organization_id: "org-1",
    name: "Burguer Vegano Black Bean",
    description: "Hambúrguer de feijão preto com guacamole e tomate seco",
    votes: 31,
    status: "in_production",
    created_at: "2025-02-11T11:00:00Z",
  },
  {
    id: "s-3",
    organization_id: "org-1",
    name: "Frango Crispy com Mel e Pimenta",
    description: "Peito de frango empanado crocante com molho de mel e pimenta",
    votes: 28,
    status: "pending",
    created_at: "2025-02-12T09:00:00Z",
  },
  {
    id: "s-4",
    organization_id: "org-1",
    name: "Burguer de Bacon Duplo",
    description: "Dois smashed patties com bacon crocante e molho especial da casa",
    votes: 19,
    status: "finished",
    created_at: "2025-02-08T14:00:00Z",
  },
  {
    id: "s-5",
    organization_id: "org-1",
    name: "X-Tudo Gourmet",
    description: "Tudo que você imaginar em um só burguer — para os corajosos!",
    votes: 15,
    status: "pending",
    created_at: "2025-02-13T16:00:00Z",
  },
  {
    id: "s-6",
    organization_id: "org-2",
    name: "Pizza de Camarão com Catupiry",
    description: "Camarão fresco, catupiry cremoso e molho de tomate artesanal",
    votes: 56,
    status: "in_production",
    created_at: "2025-02-09T12:00:00Z",
  },
  {
    id: "s-7",
    organization_id: "org-2",
    name: "Pizza Vegana Mediterrânea",
    description: "Berinjela grelhada, azeitona, tomate cereja e rúcula no molho pesto",
    votes: 38,
    status: "pending",
    created_at: "2025-02-10T15:00:00Z",
  },
  {
    id: "s-8",
    organization_id: "org-2",
    name: "Pizza Nutella com Morango",
    description: "Massa crocante com Nutella, morangos frescos e açúcar de confeiteiro",
    votes: 22,
    status: "finished",
    created_at: "2025-02-07T18:00:00Z",
  },
];
