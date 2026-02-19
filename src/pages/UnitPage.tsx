import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
} from "@/components/ui/drawer";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChefHat, Heart, ArrowLeft, Plus, X, Minus, UtensilsCrossed,
  MessageCircle, ShoppingCart, ImageOff, Lightbulb, CheckCircle2,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useSuggestions, useAddSuggestion, useIncrementVote } from "@/hooks/useSuggestions";
import { useMenuItems, CATEGORIES } from "@/hooks/useMenuItems";
import { getStoreStatus } from "@/lib/storeStatus";
import { usePlaceOrder } from "@/hooks/useOrders";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  analyzing: "Analisando",
  on_menu: "No Cardápio",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  analyzing: "bg-blue-100 text-blue-800 border-blue-200",
  on_menu: "bg-green-100 text-green-800 border-green-200",
};

type CartItem = { id: string; name: string; price: number; qty: number };

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const UnitPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: org, isLoading: orgLoading, isError } = useOrganization(slug);
  const { data: suggestions = [], isLoading: suggestionsLoading } = useSuggestions(org?.id);
  const { data: menuItems = [], isLoading: menuLoading } = useMenuItems(org?.id);

  const addMutation = useAddSuggestion(org?.id ?? "");
  const voteMutation = useIncrementVote(org?.id ?? "");
  const placeOrder = usePlaceOrder();

  // Suggestion form
  const [showForm, setShowForm] = useState(false);
  const [sugName, setSugName] = useState("");
  const [sugDesc, setSugDesc] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [votedIds, setVotedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`voted-${slug}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Cart state
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Item detail drawer
  const [selectedItem, setSelectedItem] = useState<typeof menuItems[0] | null>(null);

  // Category navigation
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const categoryNavRef = useRef<HTMLDivElement>(null);
  const isScrollingByClick = useRef(false);

  // Checkout form
  const [orderType, setOrderType] = useState<"Entrega" | "Retirada" | "">("");
  const [orderTypeError, setOrderTypeError] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerDoc, setBuyerDoc] = useState("");
  const [address, setAddress] = useState("");
  const [addressConfirm, setAddressConfirm] = useState("");
  const [payment, setPayment] = useState("");
  const [notes, setNotes] = useState("");
  const [nameError, setNameError] = useState(false);
  const [paymentError, setPaymentError] = useState(false);
  const [addressError, setAddressError] = useState(false);

  useEffect(() => {
    if (!orgLoading && (isError || org === null)) navigate("/404");
  }, [orgLoading, isError, org, navigate]);

  useEffect(() => {
    if (org?.primary_color) {
      document.documentElement.style.setProperty("--org-primary", org.primary_color);
    }
    return () => { document.documentElement.style.removeProperty("--org-primary"); };
  }, [org?.primary_color]);

  // IntersectionObserver: detect which category section is visible
  const groupedMenuForObserver = CATEGORIES.map((cat) => ({
    ...cat,
    items: menuItems.filter((i) => i.category === cat.value),
  })).filter((g) => g.items.length > 0);

  useEffect(() => {
    if (groupedMenuForObserver.length === 0) return;
    const observers = groupedMenuForObserver.map((group) => {
      const el = document.getElementById(`cat-${group.value}`);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !isScrollingByClick.current) {
            setActiveCategory(group.value);
            // Scroll manual da pill na nav — não afeta o scroll da página principal
            const navEl = categoryNavRef.current;
            const pill = document.getElementById(`pill-${group.value}`);
            if (navEl && pill) {
              const pillLeft = pill.offsetLeft - navEl.offsetLeft;
              const pillCenter = pillLeft - navEl.clientWidth / 2 + pill.clientWidth / 2;
              navEl.scrollTo({ left: pillCenter, behavior: "smooth" });
            }
          }
        },
        { threshold: 0.25, rootMargin: "-60px 0px -40% 0px" }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o?.disconnect());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuItems]);

  const scrollToCategory = (value: string) => {
    setActiveCategory(value);
    isScrollingByClick.current = true;
    const el = document.getElementById(`cat-${value}`);
    if (el) {
      const offset = 110; // header + nav bar height
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
    // Libera o flag após o scroll suave (~800ms)
    setTimeout(() => { isScrollingByClick.current = false; }, 800);
  };

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!org) return null;

  const primaryColor = org.primary_color || "#f97316";
  const whatsapp = (org as { whatsapp?: string | null }).whatsapp;

  // Store open/closed status
  const storeStatus = getStoreStatus(org.business_hours);
  const isClosed = storeStatus !== null && !storeStatus.open;
  const opensAt = isClosed && storeStatus && "opensAt" in storeStatus ? storeStatus.opensAt : null;

  // Cart helpers
  const addToCart = (item: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const existing = prev[item.id];
      return {
        ...prev,
        [item.id]: existing
          ? { ...existing, qty: existing.qty + 1 }
          : { id: item.id, name: item.name, price: item.price, qty: 1 },
      };
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      if (existing.qty <= 1) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { ...existing, qty: existing.qty - 1 } };
    });
  };

  const cartItems = Object.values(cart);
  const totalItems = cartItems.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  // Voting
  const handleVote = (id: string) => {
    if (votedIds.has(id) || voteMutation.isPending) return;
    voteMutation.mutate(id);
    const newVoted = new Set(votedIds).add(id);
    setVotedIds(newVoted);
    localStorage.setItem(`voted-${slug}`, JSON.stringify([...newVoted]));
  };

  // Suggestion submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sugName.trim()) return;
    await addMutation.mutateAsync({ name: sugName.trim(), description: sugDesc.trim() });
    setSugName("");
    setSugDesc("");
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setShowForm(false); }, 2500);
  };

  // WhatsApp checkout
  const handleSendWhatsApp = () => {
    let valid = true;
    if (!orderType) { setOrderTypeError(true); valid = false; } else setOrderTypeError(false);
    if (!buyerName.trim()) { setNameError(true); valid = false; } else setNameError(false);
    if (!payment) { setPaymentError(true); valid = false; } else setPaymentError(false);
    if (orderType === "Entrega" && address.trim() && address.trim() !== addressConfirm.trim()) {
      setAddressError(true); valid = false;
    } else {
      setAddressError(false);
    }
    if (!valid) return;

    const deliveryEmoji = orderType === "Entrega" ? "🛵" : "🏃";
    const lines = [
      `🍔 *Novo Pedido — ${org.name}*`,
      ``,
      `📋 *Itens:*`,
      ...cartItems.map(
        (i) => `• ${i.qty}x ${i.name} — ${fmt(i.price * i.qty)}`
      ),
      ``,
      `💰 *Total: ${fmt(totalPrice)}*`,
      ``,
      `${deliveryEmoji} *Tipo:* ${orderType}`,
      `👤 *Nome:* ${buyerName.trim()}`,
      orderType === "Entrega" && address.trim() ? `🏠 *Endereço:* ${address.trim()}` : null,
      `💳 *Pagamento:* ${payment}`,
      notes.trim() ? `📝 *Obs:* ${notes.trim()}` : null,
    ]
      .filter((l) => l !== null)
      .join("\n");

    const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank", "noopener,noreferrer");

    // Save order to database (table_number=0 = delivery/pickup) — runs in parallel, doesn't block WhatsApp
    if (org?.id) {
      // Structured notes format: TIPO:...|CLIENTE:...|TEL:...|END.:...|PGTO:...|DOC:...|OBS:...
      const noteParts: string[] = [
        `TIPO:${orderType}`,
        `CLIENTE:${buyerName.trim()}`,
        buyerPhone.trim() ? `TEL:${buyerPhone.trim()}` : null,
        orderType === "Entrega" && address.trim() ? `END.:${address.trim()}` : null,
        `PGTO:${payment}`,
        buyerDoc.trim() ? `DOC:${buyerDoc.trim()}` : null,
        notes.trim() ? `OBS:${notes.trim()}` : null,
      ].filter(Boolean) as string[];

      placeOrder.mutate({
        organizationId: org.id,
        tableNumber: 0,
        notes: noteParts.join("|"),
        items: cartItems.map((i) => ({
          menu_item_id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.qty,
        })),
      });
    }

    // Reset
    setCart({});
    setCheckoutOpen(false);
    setOrderType("");
    setBuyerName("");
    setBuyerPhone("");
    setBuyerDoc("");
    setAddress("");
    setAddressConfirm("");
    setPayment("");
    setNotes("");
  };

  // Group menu items by category
  const groupedMenu = CATEGORIES.map((cat) => ({
    ...cat,
    items: menuItems.filter((i) => i.category === cat.value),
  })).filter((g) => g.items.length > 0);

  const availableItems = menuItems.filter((i) => i.available);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border/60 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Início</span>
          </Link>
          <div className="flex items-center gap-2">
            {org.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <span className="text-2xl">{org.emoji}</span>
            )}
            <p className="font-bold text-foreground text-sm leading-tight">{org.name}</p>
          </div>
          <div className="w-16" />
        </div>
      </header>

      {/* Mesa banner removed — UnitPage is now public-only (no table context) */}

      <main className="max-w-2xl mx-auto px-4 pb-32 pt-4">
        {/* Banner */}
        {/* Banner */}
        <div
          className="rounded-2xl p-4 mb-5 border relative"
          style={{ backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}30` }}
        >
          {/* Badge de status aberto/fechado */}
          {storeStatus && (
            <span
              className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full ${
                storeStatus.open ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
              }`}
            >
              {storeStatus.open
                ? "Aberto agora"
                : opensAt
                ? `Fechado · abre às ${opensAt}`
                : "Fechado hoje"}
            </span>
          )}
          <p className="text-lg font-bold text-foreground mb-0.5">{org.description || `Bem-vindo ao ${org.name}!`}</p>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            Monte seu pedido e envie direto pelo WhatsApp!
          </p>
          {isClosed && (
            <div className="mt-3 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
              <span className="text-base leading-none mt-0.5">🔒</span>
              <div>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">Loja fechada · pedidos indisponíveis</p>
                {opensAt && (
                  <p className="text-xs text-red-500/80 dark:text-red-400/70 mt-0.5">Abre às {opensAt}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="menu">
          <TabsList className="w-full mb-5">
            <TabsTrigger value="menu" className="flex-1 gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              Cardápio
              {!menuLoading && menuItems.length > 0 && (
                <span className="ml-1 text-xs opacity-60">({availableItems.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex-1 gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />
              Sugestões
              {!suggestionsLoading && suggestions.length > 0 && (
                <span className="ml-1 text-xs opacity-60">({suggestions.length})</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── CARDÁPIO TAB ── */}
          <TabsContent value="menu" className="mt-0">
            {menuLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-xl" />
                ))}
              </div>
            ) : menuItems.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
                <UtensilsCrossed className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-foreground">Cardápio ainda não publicado</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Em breve teremos novidades! Enquanto isso, deixe uma sugestão. 😊
                </p>
              </div>
            ) : (
              <>
                {/* ── CATEGORY NAV BAR ── */}
                {groupedMenu.length > 1 && (
                  <div
                    ref={categoryNavRef}
                    className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {groupedMenu.map((group) => {
                      const isActive = activeCategory === group.value || (!activeCategory && groupedMenu[0].value === group.value);
                      return (
                        <button
                          key={group.value}
                          id={`pill-${group.value}`}
                          onClick={() => scrollToCategory(group.value)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 border"
                          style={
                            isActive
                              ? { backgroundColor: primaryColor, color: "#fff", borderColor: primaryColor }
                              : { backgroundColor: "transparent", color: "var(--muted-foreground)", borderColor: "var(--border)" }
                          }
                        >
                          <span>{group.emoji}</span>
                          <span>{group.value}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ── CATEGORY SECTIONS ── */}
                <div className="space-y-6">
                  {groupedMenu.map((group) => (
                    <div key={group.value} id={`cat-${group.value}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {group.value}
                        </h2>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {group.items.map((item) => {
                          const qty = cart[item.id]?.qty ?? 0;
                          return (
                            <div
                              key={item.id}
                              onClick={() => item.available && setSelectedItem(item)}
                              className={`bg-card border border-border rounded-xl overflow-hidden flex flex-col transition-opacity ${!item.available ? "opacity-60" : "cursor-pointer active:scale-[0.97] transition-transform"}`}
                            >
                              {/* Foto quadrada + badge de qty */}
                              <div className="relative aspect-square w-full bg-secondary flex items-center justify-center overflow-hidden">
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <ImageOff className="w-5 h-5 text-muted-foreground opacity-30" />
                                )}
                                {qty > 0 && (
                                  <span
                                    className="absolute top-1 right-1 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow"
                                    style={{ backgroundColor: primaryColor }}
                                  >
                                    {qty}
                                  </span>
                                )}
                              </div>

                              {/* Info */}
                              <div className="p-2 flex flex-col gap-1 flex-1">
                                <h3 className="font-semibold text-foreground text-xs leading-tight line-clamp-2">{item.name}</h3>
                                {!item.available && (
                                  <span className="text-[10px] text-destructive font-medium">Indisponível</span>
                                )}
                                <span className="font-bold text-foreground text-xs">
                                  {fmt(item.price)}
                                </span>

                                {item.available && (
                                  isClosed ? (
                                    <span className="mt-auto w-full flex items-center justify-center gap-0.5 py-1 rounded-lg text-[10px] font-semibold bg-muted text-muted-foreground cursor-not-allowed">
                                      🔒 Fechado
                                    </span>
                                  ) : qty === 0 ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                                      className="mt-auto w-full flex items-center justify-center gap-0.5 py-1 rounded-lg text-[10px] font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
                                      style={{ backgroundColor: primaryColor }}
                                    >
                                      <Plus className="w-3 h-3" />
                                      Add
                                    </button>
                                  ) : (
                                    <div className="mt-auto flex items-center justify-between w-full">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                                        className="w-5 h-5 rounded-full bg-secondary hover:bg-muted flex items-center justify-center transition-colors"
                                      >
                                        <Minus className="w-2.5 h-2.5" />
                                      </button>
                                      <span className="text-xs font-bold">{qty}</span>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                                        className="w-5 h-5 rounded-full text-primary-foreground flex items-center justify-center transition-colors"
                                        style={{ backgroundColor: primaryColor }}
                                      >
                                        <Plus className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── SUGESTÕES TAB ── */}
          <TabsContent value="suggestions" className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground text-base">
                Sugestões da galera{" "}
                <span className="text-muted-foreground font-normal text-sm">
                  ({suggestionsLoading ? "..." : suggestions.length})
                </span>
              </h2>
              <Button
                size="sm"
                className="gap-1.5"
                style={{ backgroundColor: primaryColor }}
                onClick={() => setShowForm(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Sugerir
              </Button>
            </div>

            {suggestionsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : suggestions.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <Lightbulb className="w-8 h-8 text-muted-foreground opacity-30 mx-auto mb-2" />
                <p className="font-semibold text-foreground">Nenhuma sugestão ainda</p>
                <p className="text-muted-foreground text-sm mt-1">Seja o primeiro a sugerir um item!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((s, index) => {
                  const hasVoted = votedIds.has(s.id);
                  return (
                    <Card key={s.id} className="border border-border shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-semibold text-foreground text-sm leading-snug">{s.name}</h3>
                              <Badge
                                className={`text-xs shrink-0 border ${STATUS_CLASS[s.status] ?? ""}`}
                                variant="outline"
                              >
                                {STATUS_LABEL[s.status] ?? s.status}
                              </Badge>
                            </div>
                            {s.description && (
                              <p className="text-muted-foreground text-xs leading-relaxed">{s.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end mt-3">
                          <button
                            onClick={() => handleVote(s.id)}
                            disabled={hasVoted || voteMutation.isPending}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                              hasVoted
                                ? "bg-red-50 text-red-500 cursor-not-allowed border border-red-100"
                                : "bg-secondary text-muted-foreground hover:bg-red-50 hover:text-red-500 border border-border hover:border-red-100"
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${hasVoted ? "fill-red-500" : ""}`} />
                            <span>{s.votes}</span>
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* ── FLOATING CART BAR ── */}
      {totalItems > 0 && (
        <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4">
          {isClosed ? (
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-semibold text-sm w-full max-w-sm justify-between bg-muted text-muted-foreground cursor-not-allowed">
              <div className="flex items-center gap-2">
                <span className="bg-muted-foreground/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {totalItems}
                </span>
                <span>🔒 Loja fechada</span>
              </div>
              <ShoppingCart className="w-4 h-4 opacity-50" />
              <span className="opacity-50">{fmt(totalPrice)}</span>
            </div>
          ) : (
            <button
              onClick={() => setCheckoutOpen(true)}
              className="flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-primary-foreground font-semibold text-sm w-full max-w-sm justify-between transition-transform active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-2">
                <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {totalItems}
                </span>
                <span>{totalItems === 1 ? "1 item" : `${totalItems} itens`}</span>
              </div>
              <ShoppingCart className="w-4 h-4" />
              <span>{fmt(totalPrice)}</span>
            </button>
          )}
        </div>
      )}

      {/* ── CHECKOUT DRAWER ── */}
      <Drawer open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DrawerContent className="max-h-[90dvh]">
          <DrawerHeader className="border-b border-border pb-3">
            <DrawerTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" style={{ color: primaryColor }} />
              Seu Pedido
            </DrawerTitle>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 py-4 space-y-5 flex-1">
            {/* Items summary */}
            <div className="space-y-2">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center transition-colors hover:bg-muted"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold">{item.qty}</span>
                      <button
                        onClick={() => addToCart({ id: item.id, name: item.name, price: item.price })}
                        className="w-6 h-6 rounded-full text-primary-foreground flex items-center justify-center"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm text-foreground font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{fmt(item.price * item.qty)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 font-bold text-foreground">
                <span>Total</span>
                <span className="text-lg">{fmt(totalPrice)}</span>
              </div>
            </div>

            {/* Order type selector */}
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground text-sm">
                Como você quer receber? <span className="text-destructive">*</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {(["Entrega", "Retirada"] as const).map((type) => {
                  const isSelected = orderType === type;
                  const emoji = type === "Entrega" ? "🛵" : "🏃";
                  const label = type === "Entrega" ? "Entrega" : "Retirada no local";
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setOrderType(type); setOrderTypeError(false); }}
                      className="flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 font-semibold text-sm transition-all"
                      style={
                        isSelected
                          ? { borderColor: primaryColor, backgroundColor: `${primaryColor}18`, color: primaryColor }
                          : { borderColor: "var(--border)", backgroundColor: "transparent", color: "var(--muted-foreground)" }
                      }
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
              {orderTypeError && (
                <p className="text-destructive text-xs">Selecione como quer receber o pedido</p>
              )}
            </div>

            {/* Customer info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground text-sm">Seus dados</h3>

              <div>
                <Label htmlFor="buyer-name" className="text-xs font-medium mb-1 block">
                  Nome <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="buyer-name"
                  placeholder="Seu nome"
                  value={buyerName}
                  onChange={(e) => { setBuyerName(e.target.value); setNameError(false); }}
                  maxLength={100}
                  className={nameError ? "border-destructive" : ""}
                />
                {nameError && <p className="text-destructive text-xs mt-1">Nome é obrigatório</p>}
              </div>

              <div>
                <Label htmlFor="buyer-phone" className="text-xs font-medium mb-1 block">
                  Telefone <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="buyer-phone"
                  placeholder="(11) 99999-0000"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  inputMode="tel"
                  maxLength={20}
                />
              </div>

              <div>
                <Label htmlFor="buyer-doc" className="text-xs font-medium mb-1 block">
                  CPF / CNPJ <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="buyer-doc"
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                  value={buyerDoc}
                  onChange={(e) => setBuyerDoc(e.target.value)}
                  maxLength={20}
                />
              </div>

              {orderType === "Entrega" && (
                <>
                  <div>
                    <Label htmlFor="buyer-address" className="text-xs font-medium mb-1 block">
                      Endereço <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="buyer-address"
                      placeholder="Rua, número, complemento, bairro"
                      value={address}
                      onChange={(e) => { setAddress(e.target.value); setAddressError(false); }}
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <Label htmlFor="buyer-address-confirm" className="text-xs font-medium mb-1 block">
                      Confirme o Endereço <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="buyer-address-confirm"
                      placeholder="Digite novamente para confirmar"
                      value={addressConfirm}
                      onChange={(e) => { setAddressConfirm(e.target.value); setAddressError(false); }}
                      maxLength={200}
                      className={addressError ? "border-destructive" : ""}
                    />
                    {addressError && (
                      <p className="text-destructive text-xs mt-1">⚠ Os endereços não conferem</p>
                    )}
                  </div>
                </>
              )}

              <div>
                <Label className="text-xs font-medium mb-1 block">
                  Forma de Pagamento <span className="text-destructive">*</span>
                </Label>
                <Select value={payment} onValueChange={(v) => { setPayment(v); setPaymentError(false); }}>
                  <SelectTrigger className={paymentError ? "border-destructive" : ""}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                  </SelectContent>
                </Select>
                {paymentError && <p className="text-destructive text-xs mt-1">Selecione uma forma de pagamento</p>}
              </div>

              <div>
                <Label htmlFor="buyer-notes" className="text-xs font-medium mb-1 block">
                  Observações <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="buyer-notes"
                  placeholder="Ex: Sem cebola, ponto da carne..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={300}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          <DrawerFooter className="border-t border-border pt-3">
            {isClosed ? (
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-foreground font-semibold text-sm">🔒 Loja fechada · pedidos indisponíveis</p>
                {opensAt && (
                  <p className="text-muted-foreground text-xs mt-1">Abre às {opensAt}</p>
                )}
              </div>
            ) : whatsapp ? (
              <button
                onClick={handleSendWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold text-sm transition-transform hover:scale-[1.02] active:scale-95"
                style={{ backgroundColor: "#25D366" }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Enviar Pedido pelo WhatsApp
              </button>
            ) : (
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-muted-foreground text-sm">
                  ⚠️ O WhatsApp do estabelecimento ainda não foi configurado.
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  O lojista precisa cadastrar o número no painel.
                </p>
              </div>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* ── SUGGESTION MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-bold text-foreground text-lg mb-4 flex items-center gap-2">
              <ChefHat className="w-5 h-5" style={{ color: primaryColor }} />
              Sugerir novo item
            </h2>

            {submitted ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: "#16a34a" }} />
                <p className="font-semibold text-foreground text-lg">Sugestão enviada!</p>
                <p className="text-muted-foreground text-sm">Obrigado pela sua ideia.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label htmlFor="sug-name" className="text-sm font-medium">
                    Nome do item <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sug-name"
                    placeholder="Ex: Açaí com banana"
                    value={sugName}
                    onChange={(e) => setSugName(e.target.value)}
                    maxLength={100}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sug-desc" className="text-sm font-medium">
                    Descrição <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                  </Label>
                  <Textarea
                    id="sug-desc"
                    placeholder="Detalhes sobre o item..."
                    value={sugDesc}
                    onChange={(e) => setSugDesc(e.target.value)}
                    maxLength={300}
                    rows={3}
                    className="mt-1 resize-none"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full font-semibold"
                  style={{ backgroundColor: primaryColor }}
                  disabled={addMutation.isPending || !sugName.trim()}
                >
                  {addMutation.isPending ? "Enviando..." : "Enviar Sugestão"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── ITEM DETAIL DRAWER ── */}
      <Drawer open={selectedItem !== null} onClose={() => setSelectedItem(null)}>
        <DrawerContent className="max-h-[90vh]">
          {selectedItem && (() => {
            const qty = cart[selectedItem.id]?.qty ?? 0;
            return (
              <>
                {/* Foto */}
                <div className="w-full aspect-video bg-secondary overflow-hidden">
                  {selectedItem.image_url ? (
                    <img
                      src={selectedItem.image_url}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-10 h-10 text-muted-foreground opacity-30" />
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="p-5 space-y-3 overflow-y-auto">
                  <h2 className="text-lg font-bold text-foreground leading-snug">{selectedItem.name}</h2>
                  {selectedItem.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedItem.description}</p>
                  )}
                  <p className="text-xl font-bold" style={{ color: primaryColor }}>
                    {fmt(selectedItem.price)}
                  </p>
                </div>

                {/* Ação */}
                <div className="px-5 pb-6">
                  {isClosed ? (
                    <div className="bg-muted rounded-xl p-4 text-center">
                      <p className="font-semibold text-foreground text-sm">🔒 Loja fechada · pedidos indisponíveis</p>
                      {opensAt && <p className="text-muted-foreground text-xs mt-1">Abre às {opensAt}</p>}
                    </div>
                  ) : qty === 0 ? (
                    <button
                      onClick={() => { addToCart(selectedItem); setSelectedItem(null); }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar ao carrinho
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 bg-secondary rounded-xl px-4 py-2.5">
                        <button
                          onClick={() => removeFromCart(selectedItem.id)}
                          className="w-7 h-7 rounded-full bg-background shadow flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="flex-1 text-center font-bold text-base">{qty}</span>
                        <button
                          onClick={() => addToCart(selectedItem)}
                          className="w-7 h-7 rounded-full text-white shadow flex items-center justify-center transition-colors"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => setSelectedItem(null)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Confirmar
                      </button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default UnitPage;
