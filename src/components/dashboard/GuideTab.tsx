import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Home, UtensilsCrossed, TableProperties, History, Tag,
  BarChart2, Flame, BellRing, Wallet, Store, Settings,
} from "lucide-react";

interface GuideSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  pro?: boolean;
  description: string;
  steps: string[];
  tips?: string[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "home",
    icon: <Home className="w-4 h-4" />,
    title: "Home",
    description: "A tela inicial mostra um resumo dos pedidos do dia, receita total e atalhos rápidos para as principais funções.",
    steps: [
      "Acesse o Dashboard — a Home é a primeira tela exibida.",
      "Veja o total de pedidos, receita do dia e pedidos pendentes nos cards de métricas.",
      "Use os atalhos rápidos para ir direto à Cozinha, Garçom ou Cardápio.",
    ],
    tips: ["Confira a Home no início de cada turno para ter uma visão geral rápida."],
  },
  {
    id: "menu",
    icon: <UtensilsCrossed className="w-4 h-4" />,
    title: "Meu Cardápio",
    description: "Adicione, edite e organize os itens do seu cardápio com categorias, fotos, descrições e preços.",
    steps: [
      'Vá em "Meu Cardápio" no menu lateral.',
      'Clique em "Adicionar item" para criar um novo produto.',
      "Preencha nome, preço, categoria e (opcionalmente) foto e descrição.",
      "Para editar ou remover um item, clique no ícone de ações ao lado dele.",
    ],
    tips: [
      "Use categorias para organizar os itens (ex: Lanches, Bebidas, Sobremesas).",
      "Fotos atraentes aumentam as vendas — use imagens de boa qualidade.",
    ],
  },
  {
    id: "tables",
    icon: <TableProperties className="w-4 h-4" />,
    title: "Mesas",
    description: "Crie mesas para o seu estabelecimento e gere QR Codes para que os clientes façam pedidos diretamente pelo celular.",
    steps: [
      'Acesse a aba "Mesas".',
      'Clique em "Adicionar mesa" e defina o número/label.',
      "Use o botão de QR Code para gerar e imprimir o código de cada mesa.",
      "Coloque o QR Code impresso sobre a mesa para os clientes escanearem.",
    ],
    tips: [
      "Teste o QR Code com seu celular antes de disponibilizar para clientes.",
      "Você pode renomear mesas (ex: Varanda 1, Balcão 2).",
    ],
  },
  {
    id: "history",
    icon: <History className="w-4 h-4" />,
    title: "Histórico de Pedidos",
    description: "Consulte todos os pedidos realizados, filtre por data e veja detalhes como itens, valores e status de pagamento.",
    steps: [
      'Vá em "Histórico" no menu lateral.',
      "Use os filtros de data para buscar pedidos de períodos específicos.",
      "Clique em um pedido para ver seus detalhes completos.",
    ],
    tips: ["No plano gratuito, o histórico é limitado aos últimos 7 dias. Com o Pro, acesse todo o histórico."],
  },
  {
    id: "coupons",
    icon: <Tag className="w-4 h-4" />,
    title: "Cupons de Desconto",
    pro: true,
    description: "Crie cupons promocionais com desconto fixo ou percentual para atrair novos clientes e fidelizar os atuais.",
    steps: [
      'Acesse a aba "Cupons".',
      'Clique em "Criar cupom" e defina código, tipo de desconto (% ou R$) e valor.',
      "Opcionalmente, configure valor mínimo do pedido, limite de usos e data de expiração.",
      "Compartilhe o código do cupom com seus clientes.",
    ],
    tips: [
      "Cupons com prazo curto geram senso de urgência.",
      "Acompanhe o número de usos para avaliar a eficácia da promoção.",
    ],
  },
  {
    id: "bestsellers",
    icon: <BarChart2 className="w-4 h-4" />,
    title: "Mais Vendidos",
    pro: true,
    description: "Visualize relatórios de vendas e descubra quais são os itens mais populares do seu cardápio.",
    steps: [
      'Acesse "Mais Vendidos" no menu.',
      "Veja o ranking dos itens mais pedidos com quantidade e receita.",
      "Use essas informações para ajustar seu cardápio e promoções.",
    ],
  },
  {
    id: "kitchen",
    icon: <Flame className="w-4 h-4" />,
    title: "Cozinha / KDS",
    pro: true,
    description: "O painel de produção (Kitchen Display System) mostra os pedidos em tempo real para a equipe da cozinha gerenciar o preparo.",
    steps: [
      'Abra a aba "Cozinha (KDS)" ou acesse pelo link /cozinha em outro dispositivo.',
      "Os pedidos novos aparecem automaticamente em tempo real.",
      'Clique em "Preparando" e depois "Pronto" conforme o pedido avança.',
      "A tela atualiza sozinha — ideal para um tablet ou monitor na cozinha.",
    ],
    tips: [
      "Use um tablet exclusivo na cozinha para o KDS.",
      "O KDS funciona em tela cheia para melhor visualização.",
    ],
  },
  {
    id: "waiter",
    icon: <BellRing className="w-4 h-4" />,
    title: "Painel do Garçom",
    pro: true,
    description: "O garçom consegue ver os pedidos de cada mesa, marcar entregas e gerenciar o fluxo de atendimento.",
    steps: [
      'Acesse "Painel do Garçom" ou o link /garcom em outro dispositivo.',
      "Veja os pedidos organizados por mesa.",
      "Marque pedidos como entregues conforme forem servidos.",
    ],
    tips: ["O garçom pode acessar pelo celular — ideal para o dia a dia."],
  },
  {
    id: "caixa",
    icon: <Wallet className="w-4 h-4" />,
    title: "Controle de Caixa",
    pro: true,
    description: "Abra e feche o caixa a cada turno, registre sangrias (retiradas) e acompanhe o saldo em tempo real.",
    steps: [
      'Vá em "Caixa" no menu.',
      'Clique em "Abrir caixa" e informe o valor inicial.',
      "Durante o turno, registre sangrias (retiradas de dinheiro) se necessário.",
      'No fim do turno, clique em "Fechar caixa" para gerar o resumo.',
    ],
    tips: ["Confira o saldo do caixa antes e depois de cada turno para evitar divergências."],
  },
  {
    id: "profile",
    icon: <Store className="w-4 h-4" />,
    title: "Perfil da Loja",
    description: "Configure as informações da sua loja: nome, logo, endereço, horários de funcionamento e contato.",
    steps: [
      'Acesse "Perfil da Loja" no menu.',
      "Preencha ou atualize nome, descrição, logo e emoji da loja.",
      "Configure o endereço e horários de funcionamento.",
      "Adicione seu número de WhatsApp para receber notificações.",
    ],
  },
  {
    id: "settings",
    icon: <Settings className="w-4 h-4" />,
    title: "Configurações",
    description: "Configure chave Pix para pagamentos, personalize cores do tema e ajuste preferências gerais do sistema.",
    steps: [
      'Acesse "Configurações" no menu.',
      "Configure sua chave Pix para receber pagamentos.",
      "Selecione a largura da impressora (58mm portátil ou 80mm padrão).",
      "Personalize a cor primária da sua loja.",
      "Ajuste preferências de notificações e modo de confirmação de pagamento.",
    ],
  },
];

export default function GuideTab() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Como Usar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Guia completo de cada seção do app. Clique para expandir e ver o passo a passo.
        </p>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {GUIDE_SECTIONS.map((section) => (
          <AccordionItem key={section.id} value={section.id} className="border rounded-xl px-4 bg-card">
            <AccordionTrigger className="hover:no-underline gap-3">
              <div className="flex items-center gap-3 flex-1 text-left">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  {section.icon}
                </div>
                <span className="font-medium text-sm">{section.title}</span>
                {section.pro && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-primary/20">
                    Pro+
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pl-11 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">{section.description}</p>

              <div>
                <p className="text-xs font-semibold text-foreground mb-1.5">Passo a passo:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  {section.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              {section.tips && section.tips.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1.5">💡 Dicas:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {section.tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
