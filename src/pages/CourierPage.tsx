import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Bike, MapPin, DollarSign, Package, CheckCircle2, Clock, Navigation, Download, ExternalLink, LogOut, Key, Save } from "lucide-react";
import {
  getSavedCourierId,
  clearCourierId,
  getSavedOrgSlug,
  saveOrgSlug,
  useMyCourier,
  useRegisterCourier,
  useLoginCourier,
  useAvailableDeliveries,
  useMyDeliveries,
  useAcceptDelivery,
  useCompleteDelivery,
  useCourierStats,
  type Delivery,
} from "@/hooks/useCourier";
import { parsePhoneFromNotes } from "@/hooks/useCreateDelivery";

function usePwaInstall() {
  const [prompt, setPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (prompt) {
      prompt.prompt();
      setPrompt(null);
    } else if (isIos) {
      toast.info("Para instalar: toque no botão Compartilhar (⬆️) e depois em 'Adicionar à Tela de Início'.", { duration: 6000 });
    }
  };

  return { canInstall: !!prompt || isIos, install };
}

function playDeliveryBell() {
  try {
    const ctx = new AudioContext();
    [0, 0.25].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = i === 0 ? 660 : 880;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
  } catch {}
}

function openGoogleMaps(address: string) {
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank");
}

const CourierPage = () => {
  const [searchParams] = useSearchParams();
  const orgSlugParam = searchParams.get("org") || "";
  const orgSlug = orgSlugParam || getSavedOrgSlug() || "";
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [notFound, setNotFound] = useState(false);

  // Registration form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [savingPix, setSavingPix] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [loginPhone, setLoginPhone] = useState("");
  const [manualSlug, setManualSlug] = useState("");

  const courierId = getSavedCourierId();
  const { data: courier, isLoading: courierLoading } = useMyCourier();
  const registerMutation = useRegisterCourier();
  const loginMutation = useLoginCourier();
  const { data: available = [], isLoading: availableLoading } = useAvailableDeliveries(orgId ?? undefined);
  const { data: myDeliveries = [] } = useMyDeliveries(courierId);
  const acceptMutation = useAcceptDelivery();
  const completeMutation = useCompleteDelivery();
  const { data: stats } = useCourierStats(courierId);
  const { canInstall, install } = usePwaInstall();

  // Swap PWA manifest for courier-specific one (dynamic start_url with slug)
  useEffect(() => {
    const originalTitle = document.title;
    document.title = "Motoboy TrendFood";

    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    const originalHref = manifestLink?.getAttribute("href") || "";
    let blobUrl: string | null = null;

    const manifestData = {
      name: "Motoboy TrendFood",
      short_name: "Motoboy",
      description: "Painel de entregas para motoboys",
      theme_color: "#f97316",
      background_color: "#ffffff",
      display: "standalone",
      start_url: orgSlug ? `/motoboy?org=${orgSlug}` : "/motoboy",
      scope: "/motoboy",
      icons: [
        { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
        { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
    };

    const blob = new Blob([JSON.stringify(manifestData)], { type: "application/json" });
    blobUrl = URL.createObjectURL(blob);

    if (manifestLink) {
      manifestLink.setAttribute("href", blobUrl);
    } else {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      manifestLink.href = blobUrl;
      document.head.appendChild(manifestLink);
    }

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const originalTheme = themeMeta?.getAttribute("content") || "";
    if (themeMeta) themeMeta.setAttribute("content", "#f97316");

    return () => {
      document.title = originalTitle;
      if (manifestLink) manifestLink.setAttribute("href", originalHref);
      if (themeMeta) themeMeta.setAttribute("content", originalTheme);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [orgSlug]);

  // Auto-recover org slug from courier's organization when missing
  useEffect(() => {
    if (orgSlug || !courierId) return;
    supabase
      .from("couriers")
      .select("organization_id")
      .eq("id", courierId)
      .single()
      .then(({ data: courierData }) => {
        if (!courierData) return;
        supabase
          .from("organizations")
          .select("slug")
          .eq("id", courierData.organization_id)
          .single()
          .then(({ data: orgData }) => {
            if (orgData?.slug) {
              saveOrgSlug(orgData.slug);
              window.location.href = `/motoboy?org=${encodeURIComponent(orgData.slug)}`;
            }
          });
      });
  }, [orgSlug, courierId]);

  // Fetch org by slug and persist it
  useEffect(() => {
    if (!orgSlug) return;
    supabase
      .from("organizations")
      .select("id, name")
      .eq("slug", orgSlug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setOrgId(data.id);
          setOrgName(data.name);
          saveOrgSlug(orgSlug);
        }
      });
  }, [orgSlug]);

  // Init pixKey from courier data
  useEffect(() => {
    if (courier?.pix_key) setPixKey(courier.pix_key);
  }, [courier?.pix_key]);

  // Realtime sound for new deliveries
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`courier-bell-${orgId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "deliveries",
        filter: `organization_id=eq.${orgId}`
      }, () => { playDeliveryBell(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId]);

  const handleSavePix = async () => {
    if (!courierId) return;
    setSavingPix(true);
    const { error } = await supabase.from("couriers").update({ pix_key: pixKey.trim() || null }).eq("id", courierId);
    setSavingPix(false);
    if (error) { toast.error("Erro ao salvar chave PIX."); }
    else { toast.success("Chave PIX salva! ✅"); }
  };


  if (!orgSlug) {
    const handleManualAccess = (e: React.FormEvent) => {
      e.preventDefault();
      let value = manualSlug.trim();
      // Extract slug from full URL if pasted
      const match = value.match(/[?&]org=([^&]+)/);
      if (match) value = match[1];
      // Remove leading slashes or paths
      value = value.replace(/^.*\//, "");
      if (!value) return;
      window.location.href = `/motoboy?org=${encodeURIComponent(value)}`;
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-6">
            <Bike className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-lg font-bold mb-2">Painel do Motoboy</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Digite o identificador da loja ou cole o link completo
            </p>
            <form onSubmit={handleManualAccess} className="space-y-3">
              <Input
                value={manualSlug}
                onChange={(e) => setManualSlug(e.target.value)}
                placeholder="Ex: minha-loja"
              />
              <Button type="submit" className="w-full" disabled={!manualSlug.trim()}>
                Acessar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-6">
            <p className="text-4xl mb-3">🔍</p>
            <h1 className="text-lg font-bold mb-2">Loja não encontrada</h1>
            <p className="text-sm text-muted-foreground">Verifique o link e tente novamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Registration form
  if (!courierId || (!courierLoading && !courier)) {
    const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

    const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!orgId) return;
      const upperPlate = plate.trim().toUpperCase();
      if (!PLATE_REGEX.test(upperPlate)) {
        toast.error("Placa inválida. Use o formato ABC1D23 (7 caracteres).");
        return;
      }
      try {
        const result = await registerMutation.mutateAsync({
          organization_id: orgId,
          name: name.trim(),
          phone: phone.trim(),
          plate: upperPlate,
          whatsapp: whatsapp.trim() || undefined,
        });
        if (result.isExisting) {
          toast.success("Bem-vindo de volta! 🏍️");
        } else {
          toast.success("Cadastro realizado com sucesso!");
        }
      } catch {
        toast.error("Erro ao cadastrar. Tente novamente.");
      }
    };

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!orgId) return;
      try {
        await loginMutation.mutateAsync({
          organization_id: orgId,
          phone: loginPhone.trim(),
        });
        toast.success("Bem-vindo de volta! 🏍️");
      } catch (err: any) {
        if (err?.message === "NOT_FOUND") {
          toast.error("Nenhum cadastro encontrado com esse telefone.");
        } else {
          toast.error("Erro ao entrar. Tente novamente.");
        }
      }
    };

    if (isLogin) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Bike className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-xl">Entrar como Motoboy</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{orgName}</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginPhone">Telefone cadastrado</Label>
                  <Input id="loginPhone" value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} placeholder="(11) 99999-9999" required />
                </div>
                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Não tem cadastro?{" "}
                <button type="button" onClick={() => setIsLogin(false)} className="text-primary font-medium hover:underline">
                  Cadastrar
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Bike className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-xl">Cadastro de Motoboy</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{orgName}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plate">Placa da moto</Label>
                <Input id="plate" value={plate} onChange={(e) => setPlate(e.target.value.replace(/[^A-Za-z0-9]/g, ""))} placeholder="ABC1D23" maxLength={7} required />
                <p className="text-xs text-muted-foreground">Formato: ABC1D23 (7 caracteres)</p>
              </div>
              <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Já tem cadastro?{" "}
              <button type="button" onClick={() => setIsLogin(true)} className="text-primary font-medium hover:underline">
                Entrar
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (courierLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const handleAccept = async (delivery: Delivery) => {
    if (!courierId) return;
    try {
      const result = await acceptMutation.mutateAsync({
        deliveryId: delivery.id,
        courierId,
        orderId: delivery.order_id,
      });
      toast.success("Entrega aceita! Boa corrida 🏍️");

      const phone = parsePhoneFromNotes(result.notes);
      if (phone) {
        const msg = encodeURIComponent(
          `Olá! Seu pedido da *${orgName}* saiu para entrega! 🏍️\nAguarde em seu endereço que já estamos a caminho.\nObrigado!\n\nEquipe *${orgName}* | trendfood.lovable.app/unidade/${orgSlug}`
        );
        window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
      }
    } catch {
      toast.error("Erro ao aceitar entrega.");
    }
  };

  const handleComplete = async (deliveryId: string) => {
    try {
      await completeMutation.mutateAsync(deliveryId);
      toast.success("Entrega finalizada! ✅");
    } catch {
      toast.error("Erro ao finalizar entrega.");
    }
  };

  const DeliveryCard = ({ d, actions }: { d: Delivery; actions: React.ReactNode }) => (
    <Card key={d.id} className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pedido</p>
            <p className="font-mono text-sm font-medium">#{d.order_id.slice(0, 8)}</p>
          </div>
          <Badge className={d.status === "em_rota" ? "bg-blue-500/15 text-blue-600 border-blue-500/30" : undefined} variant={d.status === "pendente" ? "secondary" : "default"}>
            {d.status === "em_rota" ? "Em rota" : "Pendente"}
          </Badge>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm">{d.customer_address}</p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {d.distance_km != null && (
            <span className="text-muted-foreground">📏 {d.distance_km.toFixed(1)} km</span>
          )}
          {d.fee != null && (
            <span className="font-semibold text-primary flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" /> R$ {d.fee.toFixed(2)}
            </span>
          )}
        </div>

        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => openGoogleMaps(d.customer_address)}>
          <ExternalLink className="w-3.5 h-3.5" /> Abrir no Google Maps
        </Button>

        {actions}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">{orgName}</span>
          </div>
          <div className="flex items-center gap-2">
            {canInstall && (
              <Button variant="ghost" size="sm" onClick={install} className="gap-1 text-xs">
                <Download className="w-3.5 h-3.5" /> Instalar
              </Button>
            )}
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{courier?.name}</p>
              <p className="text-xs font-mono text-muted-foreground">{courier?.plate}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { clearCourierId(); window.location.reload(); }} className="gap-1 text-xs text-muted-foreground">
              <LogOut className="w-3.5 h-3.5" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4">
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="available" className="gap-1.5 text-xs">
              <Package className="w-3.5 h-3.5" /> Disponíveis
            </TabsTrigger>
            <TabsTrigger value="mine" className="gap-1.5 text-xs">
              <Navigation className="w-3.5 h-3.5" /> Minhas
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5 text-xs">
              <DollarSign className="w-3.5 h-3.5" /> Resumo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-4 space-y-3">
            {availableLoading ? (
              <p className="text-center text-muted-foreground text-sm py-8">Carregando entregas...</p>
            ) : available.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma entrega disponível no momento.</p>
                <p className="text-xs text-muted-foreground mt-1">Novas entregas aparecem automaticamente aqui.</p>
              </div>
            ) : (
              available.map((d) => (
                <DeliveryCard key={d.id} d={d} actions={
                  <Button onClick={() => handleAccept(d)} className="w-full" disabled={acceptMutation.isPending}>
                    <Bike className="w-4 h-4 mr-2" /> Aceitar Entrega
                  </Button>
                } />
              ))
            )}
          </TabsContent>

          <TabsContent value="mine" className="mt-4 space-y-3">
            {myDeliveries.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma entrega em andamento.</p>
              </div>
            ) : (
              myDeliveries.map((d) => (
                <DeliveryCard key={d.id} d={d} actions={
                  <Button onClick={() => handleComplete(d.id)} variant="outline"
                    className="w-full border-green-500/30 text-green-600 hover:bg-green-500/10" disabled={completeMutation.isPending}>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar como Entregue
                  </Button>
                } />
              ))
            )}
          </TabsContent>

          <TabsContent value="stats" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{stats?.totalDeliveries ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Entregas realizadas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">R$ {(stats?.totalEarned ?? 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Total faturado</p>
                </CardContent>
              </Card>
              <Card className="border-yellow-500/30">
                <CardContent className="p-4 text-center">
                  <Clock className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-yellow-600">R$ {(stats?.totalPending ?? 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">A receber</p>
                </CardContent>
              </Card>
              <Card className="border-green-500/30">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-600">R$ {(stats?.totalPaid ?? 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Já recebido</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-3">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">Chave PIX</p>
                </div>
                <p className="text-xs text-muted-foreground">CPF, telefone, e-mail ou chave aleatória para receber pagamentos.</p>
                <Input
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Sua chave PIX"
                />
                <Button onClick={handleSavePix} disabled={savingPix} className="w-full gap-2" variant="outline">
                  <Save className="w-4 h-4" /> {savingPix ? "Salvando..." : "Salvar"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CourierPage;
