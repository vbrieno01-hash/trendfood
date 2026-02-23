import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
} from "@/components/ui/drawer";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Plus, X, Minus, UtensilsCrossed,
  ShoppingCart, Loader2, Search,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";

import { useMenuItems, CATEGORIES } from "@/hooks/useMenuItems";
import { getStoreStatus } from "@/lib/storeStatus";
import { usePlaceOrder } from "@/hooks/useOrders";
import { useDeliveryFee } from "@/hooks/useDeliveryFee";
import PixPaymentScreen from "@/components/checkout/PixPaymentScreen";
import { getStateFromCep } from "@/lib/storeAddress";
import { supabase } from "@/integrations/supabase/client";


type CartItem = { id: string; name: string; price: number; qty: number };

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const UnitPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: org, isLoading: orgLoading, isError } = useOrganization(slug);
  const { data: menuItems = [], isLoading: menuLoading } = useMenuItems(org?.id);

  const placeOrder = usePlaceOrder();

  // Cart state
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Item detail drawer
  const [selectedItem, setSelectedItem] = useState<typeof menuItems[0] | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

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
  const [payment, setPayment] = useState("");
  const [notes, setNotes] = useState("");
  const [nameError, setNameError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [paymentError, setPaymentError] = useState(false);
  const [addressError, setAddressError] = useState(false);
  const [showPixScreen, setShowPixScreen] = useState(false);
  const [pixOrderId, setPixOrderId] = useState<string | null>(null);

  // Structured customer address
  type CustomerAddress = { cep: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string };
  const emptyAddress: CustomerAddress = { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" };
  const [customerAddress, setCustomerAddress] = useState<CustomerAddress>(emptyAddress);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");
  const [cepFetchFailed, setCepFetchFailed] = useState(false);

  // Full address (with complement) for WhatsApp/order notes display
  const fullCustomerAddressDisplay = [
    customerAddress.street, customerAddress.number, customerAddress.complement,
    customerAddress.neighborhood, customerAddress.city, customerAddress.state, "Brasil"
  ].map((p) => p.trim()).filter(Boolean).join(", ");

  // Address for geocoding: uses CEP/street level only (no house number) for reliable Nominatim results.
  // The number is intentionally excluded — it often causes geocoding failures.
  // Falls back to textual address (without number/complement) if CEP is missing.
  const fullCustomerAddress = customerAddress.cep && customerAddress.city
    ? [customerAddress.cep, customerAddress.city, customerAddress.state, "Brasil"]
        .filter(Boolean).join(", ")
    : [customerAddress.street, customerAddress.neighborhood, customerAddress.city, customerAddress.state, "Brasil"]
        .map((p) => p.trim()).filter(Boolean).join(", ");

  // Delivery fee — must be before any early returns (Rules of Hooks)
  // cart/totalPrice derived inline here so hook is always at top level
  const _cartItemsForFee = Object.values(cart);
  const _totalPriceForFee = _cartItemsForFee.reduce((s, i) => s + i.price * i.qty, 0);
  const { fee: deliveryFee, freeShipping, loading: feeLoading, error: feeError, distanceKm, noStoreAddress } = useDeliveryFee(
    fullCustomerAddress,
    _totalPriceForFee,
    org ?? null,
    !!org && orderType === "Entrega" && checkoutOpen
  );

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
  const isPaused = !!(org as any).paused;
  const isClosed = isPaused || (storeStatus !== null && !storeStatus.open);
  const opensAt = !isPaused && isClosed && storeStatus && "opensAt" in storeStatus ? storeStatus.opensAt : null;

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

  // (deliveryFee and related vars declared above, before early returns)

  const grandTotal = totalPrice + (orderType === "Entrega" ? deliveryFee : 0);

  // getStateFromCep imported from shared utility




  // CEP lookup (ViaCEP)
  const fetchCustomerCep = async (cep: string) => {
    const cleaned = cep.replace(/\D/g, "");
    if (cleaned.length !== 8) return;
    setCepLoading(true);
    setCepError("");
    setCepFetchFailed(false);

    try {
      let data: Record<string, string>;
      const { data: proxyData, error: proxyError } = await supabase.functions.invoke("viacep-proxy", { body: { cep: cleaned } });
      if (proxyError || proxyData?.error) throw new Error("proxy failed");
      data = proxyData;
      if (data.erro) { setCepError("CEP não encontrado"); return; }
      setCepFetchFailed(false);
      setCustomerAddress((prev) => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
    } catch {
      // ViaCEP failed — pre-fill state from CEP prefix and ask user for city
      const inferredState = getStateFromCep(cleaned);
      setCepFetchFailed(true);
      setCepError("Erro ao buscar CEP. Preencha cidade e estado manualmente.");
      setCustomerAddress((prev) => ({
        ...prev,
        cep: cleaned,
        state: inferredState || prev.state,
      }));
    } finally {
      setCepLoading(false);
    }
  };

  // WhatsApp checkout
  const handleSendWhatsApp = (overridePayment?: string, overrideOrderId?: string) => {
   try {
    const effectivePayment = overridePayment || payment;
    let valid = true;
    if (!orderType) { setOrderTypeError(true); valid = false; } else setOrderTypeError(false);
    if (!buyerName.trim()) { setNameError(true); valid = false; } else setNameError(false);
    if (!buyerPhone.trim()) { setPhoneError(true); valid = false; } else setPhoneError(false);
    if (!effectivePayment) { setPaymentError(true); valid = false; } else setPaymentError(false);
    if (orderType === "Entrega") {
      if (!customerAddress.cep.trim() || !customerAddress.street.trim() || !customerAddress.number.trim() || !customerAddress.city.trim() || !customerAddress.state.trim()) {
        setAddressError(true); valid = false;
      } else {
        setAddressError(false);
      }
    } else {
      setAddressError(false);
    }
    if (!valid) return;

    // PIX Automático: show QR Code screen for gateway payment before sending order
    // PIX Direto/Manual: treat like cash — order goes straight to WhatsApp, customer pays on delivery
    if (effectivePayment === "PIX" && !overridePayment && org?.pix_confirmation_mode === "automatic") {
      if (org?.id) {
        const freteNote = orderType === "Entrega" && deliveryFee > 0 && !freeShipping
          ? `FRETE:${fmt(deliveryFee)}`
          : orderType === "Entrega" && freeShipping
            ? "FRETE:Grátis"
            : orderType === "Entrega" && feeError
              ? "FRETE:A combinar"
              : null;

        const noteParts: string[] = [
          `TIPO:${orderType}`,
          `CLIENTE:${buyerName.trim()}`,
          buyerPhone.trim() ? `TEL:${buyerPhone.trim()}` : null,
          orderType === "Entrega" && fullCustomerAddressDisplay ? `END.:${fullCustomerAddressDisplay}` : null,
          freteNote,
          `PGTO:PIX`,
          buyerDoc.trim() ? `DOC:${buyerDoc.trim()}` : null,
          notes.trim() ? `OBS:${notes.trim()}` : null,
        ].filter(Boolean) as string[];

        placeOrder.mutate(
          {
            organizationId: org.id,
            tableNumber: 0,
            notes: noteParts.join("|"),
            items: cartItems.map((i) => ({
              menu_item_id: i.id,
              name: i.name,
              price: i.price,
              quantity: i.qty,
            })),
            initialStatus: "awaiting_payment",
            paymentMethod: "pix",
            paid: false,
          },
          {
            onSuccess: (order) => {
              setPixOrderId(order.id);
              setShowPixScreen(true);
            },
          }
        );
      }
      return;
    }

    const deliveryEmoji = orderType === "Entrega" ? "🛵" : "🏃";
    const freightLabel = orderType === "Retirada"
      ? "Grátis"
      : freeShipping
        ? "Grátis"
        : deliveryFee > 0
          ? fmt(deliveryFee)
          : feeError
            ? "A combinar"
            : null;

    const lines = [
      `🍔 *Novo Pedido — ${org.name}*`,
      ``,
      `📋 *Itens:*`,
      ...cartItems.map((i) => `• ${i.qty}x ${i.name} — ${fmt(i.price * i.qty)}`),
      ``,
      orderType === "Entrega" && freightLabel
        ? `📦 *Subtotal:* ${fmt(totalPrice)}\n🛵 *Frete:* ${freightLabel}\n💰 *Total:* ${fmt(grandTotal)}`
        : `💰 *Total: ${fmt(totalPrice)}*`,
      ``,
      `${deliveryEmoji} *Tipo:* ${orderType}`,
      `👤 *Nome:* ${buyerName.trim()}`,
      orderType === "Entrega" && fullCustomerAddressDisplay ? `🏠 *Endereço:* ${fullCustomerAddressDisplay}` : null,
      `💳 *Pagamento:* ${effectivePayment}`,
      notes.trim() ? `📝 *Obs:* ${notes.trim()}` : null,
    ]
      .filter((l) => l !== null)
      .join("\n");

    const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(lines)}`;
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      try { window.location.href = url; } catch {}
    }

    // Save order to database (table_number=0 = delivery/pickup) — skip if already created (PIX flow)
    if (org?.id && !overrideOrderId) {
      const freteNote = orderType === "Entrega" && deliveryFee > 0 && !freeShipping
        ? `FRETE:${fmt(deliveryFee)}`
        : orderType === "Entrega" && freeShipping
          ? "FRETE:Grátis"
          : orderType === "Entrega" && feeError
            ? "FRETE:A combinar"
            : null;

      const noteParts: string[] = [
        `TIPO:${orderType}`,
        `CLIENTE:${buyerName.trim()}`,
        buyerPhone.trim() ? `TEL:${buyerPhone.trim()}` : null,
        orderType === "Entrega" && fullCustomerAddressDisplay ? `END.:${fullCustomerAddressDisplay}` : null,
        freteNote,
        `PGTO:${effectivePayment}`,
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
    resetCheckout();
   } catch (err) {
    console.error("[UnitPage] handleSendWhatsApp error:", err);
   }
  };

  const handlePixSuccess = (orderId: string, paid: boolean) => {
   try {
    setShowPixScreen(false);
    setPixOrderId(null);

    if (paid) {
      // Gateway confirmed — update order status to pending (for kitchen)
      supabase.from("orders").update({ paid: true, status: "pending" }).eq("id", orderId);
    }

    // Send WhatsApp with PIX confirmed info
    if (whatsapp) {
      const deliveryEmoji = orderType === "Entrega" ? "🛵" : "🏃";
      const freightLabel = orderType === "Retirada"
        ? "Grátis"
        : freeShipping
          ? "Grátis"
          : deliveryFee > 0
            ? fmt(deliveryFee)
            : feeError
              ? "A combinar"
              : null;

      const pixStatus = paid ? "✅ PIX Confirmado" : "⏳ PIX Aguardando confirmação";

      const lines = [
        `🍔 *Novo Pedido — ${org.name}*`,
        ``,
        `📋 *Itens:*`,
        ...cartItems.map((i) => `• ${i.qty}x ${i.name} — ${fmt(i.price * i.qty)}`),
        ``,
        orderType === "Entrega" && freightLabel
          ? `📦 *Subtotal:* ${fmt(totalPrice)}\n🛵 *Frete:* ${freightLabel}\n💰 *Total:* ${fmt(grandTotal)}`
          : `💰 *Total: ${fmt(totalPrice)}*`,
        ``,
        `${deliveryEmoji} *Tipo:* ${orderType}`,
        `👤 *Nome:* ${buyerName.trim()}`,
        orderType === "Entrega" && fullCustomerAddressDisplay ? `🏠 *Endereço:* ${fullCustomerAddressDisplay}` : null,
        `💳 *Pagamento:* ${pixStatus}`,
        notes.trim() ? `📝 *Obs:* ${notes.trim()}` : null,
      ]
        .filter((l) => l !== null)
        .join("\n");

      const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(lines)}`;
      try {
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        try { window.location.href = url; } catch {}
      }
    }

    resetCheckout();
   } catch (err) {
    console.error("[UnitPage] handlePixSuccess error:", err);
    resetCheckout();
   }
  };

  const resetCheckout = () => {
    setCart({});
    setCheckoutOpen(false);
    setOrderType("");
    setBuyerName("");
    setBuyerPhone("");
    setPhoneError(false);
    setBuyerDoc("");
    setCustomerAddress(emptyAddress);
    setPayment("");
    setNotes("");
  };


  // Filter menu items by search query
  const filteredMenuItems = searchQuery.trim()
    ? menuItems.filter((i) => {
        const q = searchQuery.toLowerCase();
        return i.name.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q));
      })
    : menuItems;

  // Group menu items by category
  const groupedMenu = CATEGORIES.map((cat) => ({
    ...cat,
    items: filteredMenuItems.filter((i) => i.category === cat.value),
  })).filter((g) => g.items.length > 0);

  

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card sticky top-0 z-40 shadow-sm">
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
            <p className="font-bold text-foreground text-base leading-tight">{org.name}</p>
          </div>
          <div className="w-16" />
        </div>
      </header>

      {/* Banner */}
      {org.banner_url && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <img
            src={org.banner_url}
            alt="Banner"
            className="w-full rounded-2xl object-cover"
            style={{ maxHeight: 180 }}
          />
        </div>
      )}

      {/* Sticky search bar */}
      {!menuLoading && menuItems.length > 0 && (
        <div className="sticky top-[57px] z-30 bg-background shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar no cardápio..."
                className="pl-9 pr-9 h-10 rounded-full bg-card border-border text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mesa banner removed — UnitPage is now public-only (no table context) */}

      <main className="max-w-2xl mx-auto px-4 pb-32 pt-4">
        {/* Banner */}
        {/* Banner */}
        <div
          className="rounded-2xl p-4 mb-5 bg-card border-l-4 shadow-sm relative"
          style={{ borderLeftColor: primaryColor, borderTopColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'transparent' }}
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
              <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {isPaused ? "Loja temporariamente fechada" : "Loja fechada · pedidos indisponíveis"}
                </p>
                {isPaused ? (
                  <p className="text-xs text-red-500/80 dark:text-red-400/70 mt-0.5">Estamos em pausa. Voltamos em breve!</p>
                ) : opensAt ? (
                  <p className="text-xs text-red-500/80 dark:text-red-400/70 mt-0.5">Abre às {opensAt}</p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Menu */}
        <div>
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
                  Em breve teremos novidades! 😊
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
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 border"
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
                <div className="space-y-8">
                  {groupedMenu.map((group) => (
                    <div key={group.value} id={`cat-${group.value}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/70">
                          {group.value}
                        </h2>
                        <div className="flex-1 h-px bg-border/60" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {group.items.map((item) => {
                          const qty = cart[item.id]?.qty ?? 0;
                          return (
                            <div
                              key={item.id}
                              onClick={() => item.available && setSelectedItem(item)}
                              className={`bg-card border border-border/50 rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all duration-200 ${!item.available ? "opacity-60" : "cursor-pointer active:scale-[0.97]"}`}
                            >
                              {/* Foto quadrada + badge de qty */}
                              <div className="relative aspect-square w-full bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center overflow-hidden">
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <UtensilsCrossed className="w-8 h-8 text-orange-300" />
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
                              <div className="p-2.5 flex flex-col gap-1 flex-1">
                                <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">{item.name}</h3>
                                {!item.available && (
                                  <span className="text-[10px] text-destructive font-medium">Indisponível</span>
                                )}
                                <span className="font-bold text-sm" style={{ color: primaryColor }}>
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
                                      className="mt-auto w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
                                      style={{ backgroundColor: primaryColor }}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Add
                                    </button>
                                  ) : (
                                    <div className="mt-auto flex items-center justify-between w-full">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                                        className="w-6 h-6 rounded-full bg-secondary hover:bg-muted flex items-center justify-center transition-colors"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="text-sm font-bold">{qty}</span>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                                        className="w-6 h-6 rounded-full text-primary-foreground flex items-center justify-center transition-colors"
                                        style={{ backgroundColor: primaryColor }}
                                      >
                                        <Plus className="w-3 h-3" />
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
        </div>
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
              {/* Subtotal / Frete / Total */}
              <div className="border-t border-border/50 pt-2 space-y-1.5">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{fmt(totalPrice)}</span>
                </div>
                {orderType === "Retirada" ? (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>🏃 Frete</span>
                    <span className="text-green-600 font-medium">Grátis</span>
                  </div>
                ) : orderType === "Entrega" ? (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      🛵 Frete
                      {distanceKm != null && (
                        <span className="text-xs">({distanceKm.toFixed(1)} km)</span>
                      )}
                    </span>
                    {noStoreAddress ? (
                      <span className="text-xs text-muted-foreground italic">A combinar via WhatsApp</span>
                    ) : feeLoading ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Calculando...
                      </span>
                    ) : feeError ? (
                      <span className="text-xs text-muted-foreground italic">A combinar via WhatsApp</span>
                    ) : freeShipping ? (
                      <span className="text-green-600 font-medium">Grátis</span>
                    ) : fullCustomerAddress.length >= 8 ? (
                      <span className="font-medium text-foreground">{fmt(deliveryFee)}</span>
                    ) : (
                      <span className="text-xs italic">Digite seu endereço</span>
                    )}
                  </div>
                ) : null}
                <div className="flex items-center justify-between pt-1 font-bold text-foreground border-t border-border/50">
                  <span>Total</span>
                  <span className="text-lg">{fmt(grandTotal)}</span>
                </div>
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
                  Telefone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="buyer-phone"
                  placeholder="(11) 99999-0000"
                  value={buyerPhone}
                  onChange={(e) => { setBuyerPhone(e.target.value); setPhoneError(false); }}
                  inputMode="tel"
                  maxLength={20}
                  className={phoneError ? "border-destructive" : ""}
                />
                {phoneError && <p className="text-destructive text-xs mt-1">Telefone é obrigatório</p>}
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
                <div className="space-y-3">
                  {/* CEP */}
                  <div>
                    <Label htmlFor="buyer-cep" className="text-xs font-medium mb-1 block">
                      CEP <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="buyer-cep"
                        placeholder="00000-000"
                        value={customerAddress.cep}
                        onChange={(e) => {
                          setCustomerAddress((p) => ({ ...p, cep: e.target.value }));
                          setAddressError(false);
                          setCepError("");
                        }}
                        onBlur={(e) => fetchCustomerCep(e.target.value)}
                        inputMode="numeric"
                        maxLength={9}
                        className={addressError && !customerAddress.cep ? "border-destructive" : ""}
                      />
                      <button
                        type="button"
                        onClick={() => fetchCustomerCep(customerAddress.cep)}
                        disabled={cepLoading}
                        className="shrink-0 px-3 py-2 rounded-md border border-border bg-secondary text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {cepLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        {cepLoading ? "Buscando..." : "Buscar"}
                      </button>
                    </div>
                    {cepError && <p className="text-destructive text-xs mt-1">{cepError}</p>}
                  </div>

                  {/* Logradouro + Número */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Label htmlFor="buyer-street" className="text-xs font-medium mb-1 block">
                        Logradouro <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="buyer-street"
                        placeholder="Rua, Av., etc."
                        value={customerAddress.street}
                        onChange={(e) => { setCustomerAddress((p) => ({ ...p, street: e.target.value })); setAddressError(false); }}
                        className={addressError && !customerAddress.street ? "border-destructive" : ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="buyer-number" className="text-xs font-medium mb-1 block">
                        Número <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="buyer-number"
                        placeholder="123"
                        value={customerAddress.number}
                        onChange={(e) => { setCustomerAddress((p) => ({ ...p, number: e.target.value })); setAddressError(false); }}
                        className={addressError && !customerAddress.number ? "border-destructive" : ""}
                      />
                    </div>
                  </div>

                  {/* Complemento */}
                  <div>
                    <Label htmlFor="buyer-complement" className="text-xs font-medium mb-1 block">
                      Complemento <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <Input
                      id="buyer-complement"
                      placeholder="Apto, Bloco, Sala..."
                      value={customerAddress.complement}
                      onChange={(e) => setCustomerAddress((p) => ({ ...p, complement: e.target.value }))}
                    />
                  </div>

                  {/* Bairro + Cidade */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="buyer-neighborhood" className="text-xs font-medium mb-1 block">
                        Bairro <span className="text-muted-foreground font-normal">(opcional)</span>
                      </Label>
                      <Input
                        id="buyer-neighborhood"
                        placeholder="Centro"
                        value={customerAddress.neighborhood}
                        onChange={(e) => setCustomerAddress((p) => ({ ...p, neighborhood: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="buyer-city" className="text-xs font-medium mb-1 block">
                        Cidade <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="buyer-city"
                        placeholder="Cubatão"
                        value={customerAddress.city}
                        onChange={(e) => { setCustomerAddress((p) => ({ ...p, city: e.target.value })); setAddressError(false); setCepFetchFailed(false); }}
                        className={`${addressError && !customerAddress.city ? "border-destructive" : ""} ${cepFetchFailed && !customerAddress.city ? "border-yellow-400 ring-1 ring-yellow-400" : ""}`}
                      />
                    </div>
                  </div>

                  {/* Estado */}
                  <div>
                    <Label htmlFor="buyer-state" className="text-xs font-medium mb-1 block">
                      Estado <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={customerAddress.state}
                      onValueChange={(v) => { setCustomerAddress((p) => ({ ...p, state: v })); setAddressError(false); }}
                    >
                      <SelectTrigger id="buyer-state" className={`${addressError && !customerAddress.state ? "border-destructive" : ""} ${cepFetchFailed && !customerAddress.state ? "border-yellow-400 ring-1 ring-yellow-400" : ""}`}>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((uf) => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {addressError && (
                    <p className="text-destructive text-xs">⚠ Preencha CEP, logradouro, número, cidade e estado</p>
                  )}
                </div>
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
              showPixScreen && pixOrderId ? (
                <PixPaymentScreen
                  amount={grandTotal}
                  orgId={org.id}
                  orgName={org.name}
                  pixConfirmationMode={org.pix_confirmation_mode}
                  primaryColor={primaryColor}
                  orderId={pixOrderId}
                  onSuccess={handlePixSuccess}
                  onCancel={() => { setShowPixScreen(false); setPixOrderId(null); }}
                />
              ) : (
                <button
                  onClick={() => handleSendWhatsApp()}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold text-sm transition-transform hover:scale-[1.02] active:scale-95"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Enviar Pedido pelo WhatsApp
                </button>
              )
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

      {/* ── ITEM DETAIL DRAWER ── */}
      <Drawer open={selectedItem !== null} onClose={() => setSelectedItem(null)}>
        <DrawerContent className="max-h-[90vh]">
          {selectedItem && (() => {
            const qty = cart[selectedItem.id]?.qty ?? 0;
            return (
              <>
                {/* Foto */}
                <div className="w-full aspect-video bg-gradient-to-br from-amber-50 to-orange-100 overflow-hidden">
                  {selectedItem.image_url ? (
                    <img
                      src={selectedItem.image_url}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UtensilsCrossed className="w-12 h-12 text-orange-300" />
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
