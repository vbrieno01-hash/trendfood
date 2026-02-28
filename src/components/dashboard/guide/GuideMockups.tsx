import GuideMockup from "./GuideMockup";
import GuideArrow from "./GuideArrow";
import {
  UtensilsCrossed, TableProperties, Flame, BellRing, Settings,
  Plus, Truck, QrCode, Calendar, DollarSign, Palette,
  ShoppingCart, Clock, Check, Search, Printer,
} from "lucide-react";

/* ─── Home ─── */
export function MockupHome() {
  return (
    <GuideMockup title="Home — Painel">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg border border-border bg-card p-2 text-center">
          <p className="text-muted-foreground text-[9px]">Pedidos Hoje</p>
          <p className="font-bold text-foreground">12</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2 text-center">
          <p className="text-muted-foreground text-[9px]">Receita</p>
          <p className="font-bold text-foreground">R$ 480</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2 text-center">
          <p className="text-muted-foreground text-[9px]">Pendentes</p>
          <p className="font-bold text-primary">3</p>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1 rounded-lg bg-primary/10 border border-primary/20 p-2 text-center">
          <Flame className="w-3 h-3 mx-auto text-primary mb-0.5" />
          <span className="text-[9px] text-primary font-medium">Cozinha</span>
          <GuideArrow label="Atalho rápido!" className="absolute -top-4 left-1/2 -translate-x-1/2" />
        </div>
        <div className="flex-1 rounded-lg bg-primary/10 border border-primary/20 p-2 text-center">
          <BellRing className="w-3 h-3 mx-auto text-primary mb-0.5" />
          <span className="text-[9px] text-primary font-medium">Garçom</span>
        </div>
        <div className="flex-1 rounded-lg bg-primary/10 border border-primary/20 p-2 text-center">
          <UtensilsCrossed className="w-3 h-3 mx-auto text-primary mb-0.5" />
          <span className="text-[9px] text-primary font-medium">Cardápio</span>
        </div>
      </div>
    </GuideMockup>
  );
}

/* ─── Cardápio — lista ─── */
export function MockupMenuList() {
  return (
    <GuideMockup title="Meu Cardápio">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-foreground">Itens</span>
        <div className="relative">
          <div className="rounded-md bg-primary text-primary-foreground px-2 py-1 text-[10px] flex items-center gap-1">
            <Plus className="w-3 h-3" /> Adicionar item
          </div>
          <GuideArrow label="Clique aqui para adicionar" className="absolute -top-4 right-0" />
        </div>
      </div>
      <div className="space-y-1.5">
        {["X-Burguer — R$ 18,00", "Coca-Cola — R$ 7,00", "Batata Frita — R$ 12,00"].map((item) => (
          <div key={item} className="flex justify-between items-center rounded-lg border border-border bg-card px-2 py-1.5">
            <span className="text-foreground text-[10px]">{item}</span>
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        ))}
      </div>
    </GuideMockup>
  );
}

/* ─── Cardápio — edição ─── */
export function MockupMenuEdit() {
  return (
    <GuideMockup title="Editar Item">
      <div className="space-y-2">
        <div>
          <label className="text-[9px] text-muted-foreground">Nome</label>
          <div className="rounded border border-input bg-background px-2 py-1 text-[10px] text-foreground">X-Burguer</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-muted-foreground">Preço</label>
            <div className="rounded border border-input bg-background px-2 py-1 text-[10px] text-foreground">R$ 18,00</div>
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground">Categoria</label>
            <div className="rounded border border-input bg-background px-2 py-1 text-[10px] text-foreground">Lanches</div>
          </div>
        </div>
        <div>
          <label className="text-[9px] text-muted-foreground">Foto</label>
          <div className="rounded border border-dashed border-input bg-background px-2 py-2 text-center text-[10px] text-muted-foreground">
            📷 Clique para enviar imagem
          </div>
        </div>
        <div className="relative">
          <div className="rounded-md bg-primary text-primary-foreground px-2 py-1 text-[10px] text-center">
            Salvar item
          </div>
          <GuideArrow label="Salve as alterações" className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full" />
        </div>
      </div>
    </GuideMockup>
  );
}

/* ─── Adicionais — modal ─── */
export function MockupAddonsModal() {
  return (
    <GuideMockup title="Adicionais do Item">
      <p className="text-muted-foreground text-[10px] mb-2">Gerencie complementos do item (ex: bacon extra, queijo)</p>
      <div className="space-y-1.5 mb-2">
        {[
          { name: "Bacon extra", price: "R$ 4,00" },
          { name: "Queijo cheddar", price: "R$ 3,00" },
        ].map((a) => (
          <div key={a.name} className="flex justify-between items-center rounded-lg border border-border bg-card px-2 py-1.5">
            <span className="text-[10px] text-foreground">{a.name}</span>
            <span className="text-[10px] text-muted-foreground">{a.price}</span>
          </div>
        ))}
      </div>
      <div className="relative inline-block">
        <div className="rounded-md bg-primary text-primary-foreground px-2 py-1 text-[10px] flex items-center gap-1">
          <Plus className="w-3 h-3" /> Adicionar complemento
        </div>
        <GuideArrow label="Adicione adicionais aqui" className="absolute -top-4 left-0" />
      </div>
    </GuideMockup>
  );
}

/* ─── Adicionais — visão do cliente ─── */
export function MockupAddonsClient() {
  return (
    <GuideMockup title="Visão do Cliente">
      <div className="rounded-lg border border-border bg-card p-2 mb-2">
        <p className="font-semibold text-foreground text-[11px]">X-Burguer</p>
        <p className="text-muted-foreground text-[9px]">R$ 18,00</p>
      </div>
      <p className="text-[10px] font-semibold text-foreground mb-1">Adicionais:</p>
      <div className="space-y-1 mb-2">
        <label className="flex items-center gap-2 text-[10px] text-foreground">
          <div className="w-3 h-3 rounded border border-primary bg-primary/20 flex items-center justify-center">
            <Check className="w-2 h-2 text-primary" />
          </div>
          Bacon extra (+R$ 4,00)
        </label>
        <label className="flex items-center gap-2 text-[10px] text-foreground relative">
          <div className="w-3 h-3 rounded border border-input" />
          Queijo cheddar (+R$ 3,00)
          <GuideArrow label="Cliente seleciona aqui" className="absolute -right-2 translate-x-full" />
        </label>
      </div>
      <div className="rounded-md bg-primary text-primary-foreground px-2 py-1 text-[10px] text-center">
        <ShoppingCart className="w-3 h-3 inline mr-1" />
        Adicionar ao pedido — R$ 22,00
      </div>
    </GuideMockup>
  );
}

/* ─── Mesas ─── */
export function MockupTables() {
  return (
    <GuideMockup title="Mesas">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-foreground">Suas Mesas</span>
        <div className="rounded-md bg-primary text-primary-foreground px-2 py-1 text-[10px] flex items-center gap-1">
          <Plus className="w-3 h-3" /> Adicionar mesa
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="relative rounded-lg border border-border bg-card p-2 text-center">
            <TableProperties className="w-4 h-4 mx-auto text-foreground mb-1" />
            <p className="text-[10px] font-medium text-foreground">Mesa {n}</p>
            <div className="mt-1 flex justify-center">
              <QrCode className="w-3 h-3 text-primary" />
            </div>
            {n === 1 && <GuideArrow label="Gerar QR Code" className="absolute -bottom-4 left-1/2 -translate-x-1/2" />}
          </div>
        ))}
      </div>
    </GuideMockup>
  );
}

/* ─── Histórico ─── */
export function MockupHistory() {
  return (
    <GuideMockup title="Histórico de Pedidos">
      <div className="flex gap-2 mb-2 items-center">
        <div className="relative flex items-center gap-1 rounded border border-input bg-background px-2 py-1 text-[10px] text-muted-foreground">
          <Calendar className="w-3 h-3" /> 01/02 — 07/02
          <GuideArrow label="Filtre por data" className="absolute -top-4 left-0" />
        </div>
        <div className="flex items-center gap-1 rounded border border-input bg-background px-2 py-1 text-[10px] text-muted-foreground">
          <Search className="w-3 h-3" /> Buscar
        </div>
      </div>
      <div className="space-y-1.5">
        {[
          { num: "#042", total: "R$ 35,00", status: "Entregue" },
          { num: "#041", total: "R$ 22,00", status: "Pago" },
        ].map((o) => (
          <div key={o.num} className="flex justify-between items-center rounded-lg border border-border bg-card px-2 py-1.5">
            <span className="text-[10px] font-medium text-foreground">{o.num}</span>
            <span className="text-[10px] text-muted-foreground">{o.total}</span>
            <span className="text-[9px] rounded-full bg-primary/10 text-primary px-1.5">{o.status}</span>
          </div>
        ))}
      </div>
    </GuideMockup>
  );
}

/* ─── Cupons ─── */
export function MockupCoupons() {
  return (
    <GuideMockup title="Criar Cupom">
      <div className="space-y-2">
        <div>
          <label className="text-[9px] text-muted-foreground">Código</label>
          <div className="rounded border border-input bg-background px-2 py-1 text-[10px] text-foreground">PROMO10</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-muted-foreground">Tipo</label>
            <div className="rounded border border-input bg-background px-2 py-1 text-[10px] text-foreground">Percentual (%)</div>
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground">Valor</label>
            <div className="rounded border border-input bg-background px-2 py-1 text-[10px] text-foreground">10%</div>
          </div>
        </div>
        <div className="relative">
          <div className="rounded-md bg-primary text-primary-foreground px-2 py-1 text-[10px] text-center">
            Criar cupom
          </div>
          <GuideArrow label="Crie o cupom" className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full" />
        </div>
      </div>
    </GuideMockup>
  );
}

/* ─── Mais Vendidos ─── */
export function MockupBestSellers() {
  return (
    <GuideMockup title="Mais Vendidos">
      <div className="space-y-1.5">
        {[
          { pos: "🥇", name: "X-Burguer", qty: "48 vendas", revenue: "R$ 864" },
          { pos: "🥈", name: "Coca-Cola", qty: "35 vendas", revenue: "R$ 245" },
          { pos: "🥉", name: "Batata Frita", qty: "29 vendas", revenue: "R$ 348" },
        ].map((item) => (
          <div key={item.name} className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5">
            <span className="text-sm">{item.pos}</span>
            <div className="flex-1">
              <p className="text-[10px] font-medium text-foreground">{item.name}</p>
              <p className="text-[9px] text-muted-foreground">{item.qty}</p>
            </div>
            <span className="text-[10px] font-semibold text-primary">{item.revenue}</span>
          </div>
        ))}
      </div>
    </GuideMockup>
  );
}

/* ─── Cozinha / KDS ─── */
export function MockupKitchen() {
  return (
    <GuideMockup title="Cozinha (KDS)">
      <div className="grid grid-cols-2 gap-2">
        <div className="relative rounded-lg border-2 border-yellow-500/50 bg-yellow-500/5 p-2">
          <p className="text-[9px] font-bold text-yellow-600 mb-1">Pedido #043</p>
          <p className="text-[10px] text-foreground">1x X-Burguer</p>
          <p className="text-[10px] text-foreground">1x Batata</p>
          <div className="mt-1.5 rounded bg-yellow-500/20 text-yellow-700 text-[9px] text-center py-0.5 font-medium">
            ⏳ Preparando
          </div>
          <GuideArrow label="Mude o status" className="absolute -bottom-4 left-1/2 -translate-x-1/2" />
        </div>
        <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-2">
          <p className="text-[9px] font-bold text-primary mb-1">Pedido #044</p>
          <p className="text-[10px] text-foreground">2x Coca-Cola</p>
          <div className="mt-1.5 rounded bg-primary/20 text-primary text-[9px] text-center py-0.5 font-medium">
            🆕 Novo
          </div>
        </div>
      </div>
    </GuideMockup>
  );
}

/* ─── Garçom ─── */
export function MockupWaiter() {
  return (
    <GuideMockup title="Painel do Garçom">
      <div className="space-y-2">
        {[
          { mesa: "Mesa 1", items: "1x X-Burguer, 1x Coca", status: "Pronto" },
          { mesa: "Mesa 3", items: "2x Batata Frita", status: "Preparando" },
        ].map((m) => (
          <div key={m.mesa} className="relative rounded-lg border border-border bg-card p-2">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-[10px] text-foreground">{m.mesa}</span>
              <span className={`text-[9px] rounded-full px-1.5 ${
                m.status === "Pronto" ? "bg-primary/10 text-primary" : "bg-yellow-500/10 text-yellow-600"
              }`}>{m.status}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{m.items}</p>
            {m.status === "Pronto" && (
              <>
                <div className="mt-1 rounded bg-primary/10 text-primary text-[9px] text-center py-0.5 font-medium">
                  ✓ Marcar como entregue
                </div>
                <GuideArrow label="Confirme a entrega" className="absolute -right-2 top-3 translate-x-full" />
              </>
            )}
          </div>
        ))}
      </div>
    </GuideMockup>
  );
}

/* ─── Caixa ─── */
export function MockupCashier() {
  return (
    <GuideMockup title="Controle de Caixa">
      <div className="rounded-lg border border-border bg-card p-2 mb-2 text-center">
        <p className="text-[9px] text-muted-foreground">Saldo atual</p>
        <p className="text-lg font-bold text-foreground">R$ 1.250,00</p>
        <p className="text-[9px] text-muted-foreground"><Clock className="w-3 h-3 inline" /> Aberto às 08:00</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-destructive/10 text-destructive text-[10px] text-center py-1.5 font-medium border border-destructive/20">
          Sangria (retirada)
        </div>
        <div className="relative rounded-md bg-primary text-primary-foreground text-[10px] text-center py-1.5 font-medium">
          Fechar caixa
          <GuideArrow label="Encerre o turno" className="absolute -top-4 right-0" />
        </div>
      </div>
    </GuideMockup>
  );
}

/* ─── Frete / Entrega ─── */
export function MockupDelivery() {
  return (
    <GuideMockup title="Configuração de Frete">
      <p className="text-[10px] text-muted-foreground mb-2">Configure faixas de preço por distância (km)</p>
      <div className="space-y-1.5 mb-2">
        {[
          { range: "0 – 3 km", price: "R$ 5,00" },
          { range: "3 – 5 km", price: "R$ 8,00" },
          { range: "5 – 10 km", price: "R$ 15,00" },
        ].map((f) => (
          <div key={f.range} className="flex justify-between items-center rounded-lg border border-border bg-card px-2 py-1.5">
            <span className="text-[10px] text-foreground flex items-center gap-1">
              <Truck className="w-3 h-3 text-primary" /> {f.range}
            </span>
            <span className="text-[10px] font-semibold text-foreground">{f.price}</span>
          </div>
        ))}
      </div>
      <div className="relative inline-block">
        <div className="rounded-md bg-primary text-primary-foreground px-2 py-1 text-[10px] flex items-center gap-1">
          <Plus className="w-3 h-3" /> Adicionar faixa
        </div>
        <GuideArrow label="Crie faixas de frete" className="absolute -top-4 left-0" />
      </div>
    </GuideMockup>
  );
}

/* ─── Perfil da Loja ─── */
export function MockupStoreProfile() {
  return (
    <GuideMockup title="Perfil da Loja">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-lg">🍔</div>
          <div>
            <p className="text-[10px] font-semibold text-foreground">Rei do Burguer</p>
            <p className="text-[9px] text-muted-foreground">slug: rei-do-burguer</p>
          </div>
        </div>
        <div>
          <label className="text-[9px] text-muted-foreground">Nome da Loja</label>
          <div className="rounded border border-input bg-background px-2 py-1 text-[10px] text-foreground">Rei do Burguer</div>
        </div>
        <div className="relative">
          <label className="text-[9px] text-muted-foreground">WhatsApp</label>
          <div className="rounded border border-input bg-background px-2 py-1 text-[10px] text-foreground">(13) 99999-0000</div>
          <GuideArrow label="Configure seu WhatsApp" className="absolute right-0 top-0" />
        </div>
      </div>
    </GuideMockup>
  );
}

/* ─── Configurações ─── */
export function MockupSettings() {
  return (
    <GuideMockup title="Configurações">
      <div className="space-y-2">
        <div className="relative">
          <label className="text-[9px] text-muted-foreground">Chave Pix</label>
          <div className="rounded border border-input bg-background px-2 py-1 text-[10px] text-foreground flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-primary" /> email@loja.com
          </div>
          <GuideArrow label="Configure seu Pix" className="absolute right-0 top-0" />
        </div>
        <div>
          <label className="text-[9px] text-muted-foreground">Impressora</label>
          <div className="rounded border border-input bg-background px-2 py-1 text-[10px] text-foreground flex items-center gap-1">
            <Printer className="w-3 h-3" /> 58mm (portátil)
          </div>
        </div>
        <div>
          <label className="text-[9px] text-muted-foreground">Cor primária</label>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary border border-border" />
            <Palette className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-foreground">Personalizar tema</span>
          </div>
        </div>
      </div>
    </GuideMockup>
  );
}
