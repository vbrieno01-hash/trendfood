import { Badge } from "@/components/ui/badge";
import showcaseImg from "@/assets/showcase-devices.png";

const ShowcaseSection = () => {
  return (
    <section className="py-20 px-4 bg-background overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            Veja o sistema em ação
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
            Painel completo de gestão{" "}
            <span className="text-primary">e cardápio digital integrado</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Do painel de faturamento ao cardápio do cliente — tudo integrado, tudo em tempo real.
          </p>
        </div>

        {/* 3-column layout */}
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-6">
          {/* Left text */}
          <div className="lg:w-56 flex-shrink-0 text-center lg:text-right order-2 lg:order-1">
            <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">
              Painel de Gestão
            </Badge>
            <h3 className="font-bold text-foreground text-lg mb-2">
              Faturamento e pedidos em tempo real
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Acompanhe o faturamento do dia, ticket médio, mais vendidos e pedidos ativos — tudo atualizado ao vivo no seu dashboard.
            </p>
            {/* Arrow pointing right (desktop) */}
            <div className="hidden lg:flex justify-end mt-4">
              <svg width="60" height="40" viewBox="0 0 60 40" fill="none" className="text-primary opacity-60">
                <path d="M4 20 Q30 4 54 20" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4 3"/>
                <path d="M48 14 L54 20 L46 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Center mockups */}
          <div className="flex-1 flex justify-center order-1 lg:order-2 px-4 lg:px-8">
            <img
              src={showcaseImg}
              alt="Painel TrendFood - Dashboard e cardápio digital"
              className="w-full max-w-[520px] drop-shadow-2xl"
            />
          </div>

          {/* Right text */}
          <div className="lg:w-56 flex-shrink-0 text-center lg:text-left order-3">
            <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">
              Catálogo Digital
            </Badge>
            <h3 className="font-bold text-foreground text-lg mb-2">
              Seus clientes pedem pelo celular
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Catálogo bonito, responsivo e sem app. O cliente escaneia o QR Code do ponto de atendimento e faz o pedido em segundos — direto para o painel da equipe.
            </p>
            {/* Arrow pointing left (desktop) */}
            <div className="hidden lg:flex justify-start mt-4">
              <svg width="60" height="40" viewBox="0 0 60 40" fill="none" className="text-primary opacity-60">
                <path d="M56 20 Q30 4 6 20" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4 3"/>
                <path d="M12 14 L6 20 L14 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShowcaseSection;
