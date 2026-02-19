import { Badge } from "@/components/ui/badge";
import { ChefHat, Home, UtensilsCrossed, Grid3X3, ChefHat as KitchenIcon, Users } from "lucide-react";

const DashboardMockup = () => (
  <div className="relative w-full" style={{ maxWidth: 520 }}>
    {/* Laptop frame */}
    <div className="rounded-xl overflow-hidden shadow-2xl border border-gray-200" style={{ background: "#1a1a2e" }}>
      {/* Mac-style title bar */}
      <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: "#2a2a3e" }}>
        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        <div className="flex-1 mx-3">
          <div className="h-3.5 rounded bg-white/10 w-40 mx-auto" />
        </div>
      </div>

      {/* App body */}
      <div className="flex" style={{ height: 300 }}>
        {/* Sidebar */}
        <div className="w-28 flex-shrink-0 flex flex-col py-3 px-2 gap-1" style={{ background: "#0f0f1a", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Logo */}
          <div className="flex items-center gap-1.5 px-1 mb-3">
            <div className="w-5 h-5 rounded bg-red-600 flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-3 h-3 text-white" />
            </div>
            <span className="text-white text-xs font-bold leading-tight">TrendFood</span>
          </div>
          {/* Store name */}
          <div className="px-1 mb-2">
            <p className="text-white/40 text-[9px] uppercase tracking-wide">Estabelecimento</p>
            <p className="text-white text-[10px] font-semibold truncate">Burguer do Rei</p>
          </div>
          {/* Nav items */}
          {[
            { icon: <Home className="w-3 h-3" />, label: "Home", active: true },
            { icon: <UtensilsCrossed className="w-3 h-3" />, label: "Cardápio", active: false },
            { icon: <Grid3X3 className="w-3 h-3" />, label: "Mesas", active: false },
            { icon: <KitchenIcon className="w-3 h-3" />, label: "Cozinha", active: false },
            { icon: <Users className="w-3 h-3" />, label: "Garçom", active: false },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                item.active
                  ? "bg-red-600 text-white"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden p-3 flex flex-col gap-2" style={{ background: "#f8f5f2" }}>
          <p className="text-[10px] font-bold text-gray-700">Home</p>

          {/* Big revenue card */}
          <div className="rounded-lg p-2.5 text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #c0392b, #e74c3c)" }}>
            <p className="text-[9px] opacity-80 mb-0.5">Faturamento Hoje</p>
            <p className="text-base font-black leading-tight">R$ 880,00</p>
            <p className="text-[9px] opacity-70 mt-0.5">15 pedidos pagos</p>
          </div>

          {/* Metric cards row */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "Fat. Total", value: "R$ 12.440", color: "text-green-600" },
              { label: "Pedidos hoje", value: "15", color: "text-blue-600" },
              { label: "Ag. pagamento", value: "R$ 240", color: "text-yellow-600" },
              { label: "Ticket médio", value: "R$ 58,67", color: "text-purple-600" },
            ].map((m) => (
              <div key={m.label} className="bg-white rounded-md p-1.5 border border-gray-100">
                <p className="text-[8px] text-gray-500 leading-tight">{m.label}</p>
                <p className={`text-[11px] font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Mini bar chart */}
          <div className="bg-white rounded-md p-2 border border-gray-100 flex-1">
            <p className="text-[8px] text-gray-500 mb-1.5">Últimos 7 dias</p>
            <div className="flex items-end gap-1 h-10">
              {[40, 65, 45, 80, 55, 70, 100].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-sm"
                    style={{ height: `${h}%`, background: i === 6 ? "#e74c3c" : "#f87171", opacity: i === 6 ? 1 : 0.6 }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Laptop base */}
    <div className="mx-auto h-2 rounded-b-lg" style={{ width: "60%", background: "#d1d5db" }} />
    <div className="mx-auto h-1 rounded-b-xl" style={{ width: "80%", background: "#9ca3af" }} />

    {/* Mobile mockup overlapping bottom-right */}
    <div
      className="absolute z-10"
      style={{ right: -28, bottom: -32, width: 110 }}
    >
      {/* Phone frame */}
      <div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-800" style={{ background: "#fff" }}>
        {/* Status bar */}
        <div className="flex items-center justify-between px-2 py-1" style={{ background: "#0f0f1a" }}>
          <span className="text-[7px] text-white font-medium">9:41</span>
          <div className="w-8 h-2 rounded-full bg-black border border-gray-600 mx-auto absolute left-1/2 -translate-x-1/2" />
          <div className="flex gap-0.5">
            <div className="w-1.5 h-1.5 rounded-sm bg-white/60" />
            <div className="w-1.5 h-1.5 rounded-sm bg-white/60" />
          </div>
        </div>

        {/* App header */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100">
          <div className="w-4 h-4 rounded bg-red-600 flex items-center justify-center flex-shrink-0">
            <ChefHat className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="text-[9px] font-bold text-gray-800 truncate">Burguer do Rei</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <div className="flex-1 py-1 text-center text-[8px] font-bold text-red-600 border-b-2 border-red-600">Cardápio</div>
          <div className="flex-1 py-1 text-center text-[8px] text-gray-400">Sugestões</div>
        </div>

        {/* Category chip */}
        <div className="px-2 py-1.5 flex gap-1">
          <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[7px] font-semibold">🍔 Hambúrg.</span>
        </div>

        {/* Product card */}
        <div className="mx-2 mb-2 rounded-lg border border-gray-100 overflow-hidden shadow-sm">
          <div className="h-10 bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
            <span className="text-xl">🍔</span>
          </div>
          <div className="p-1.5">
            <p className="text-[8px] font-bold text-gray-800">Duplo Cheddar</p>
            <p className="text-[7px] text-gray-400 leading-tight">Dois hambúrgueres, queijo...</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[9px] font-black text-red-600">R$ 36,00</span>
              <div className="px-1.5 py-0.5 rounded bg-gray-900 text-white text-[7px] font-bold">+ Add</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

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
            Uma maneira simples de{" "}
            <span className="text-primary">gerenciar e vender mais</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Do painel de gestão ao cardápio digital — tudo integrado, tudo em tempo real.
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
              Seus números em tempo real
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Acompanhe o faturamento do dia, ticket médio e pedidos pagos direto no painel. Tudo atualizado ao vivo, sem precisar recarregar.
            </p>
            {/* Arrow pointing right (desktop) / down (mobile) */}
            <div className="hidden lg:flex justify-end mt-4">
              <svg width="60" height="40" viewBox="0 0 60 40" fill="none" className="text-primary opacity-60">
                <path d="M4 20 Q30 4 54 20" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4 3"/>
                <path d="M48 14 L54 20 L46 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Center mockups */}
          <div className="flex-1 flex justify-center order-1 lg:order-2 px-4 lg:px-8">
            <DashboardMockup />
          </div>

          {/* Right text */}
          <div className="lg:w-56 flex-shrink-0 text-center lg:text-left order-3">
            <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">
              Cardápio Digital
            </Badge>
            <h3 className="font-bold text-foreground text-lg mb-2">
              Seus clientes pedem pelo celular
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Cardápio bonito, responsivo e sem app. O cliente acessa pelo QR Code da mesa e faz o pedido em segundos.
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
