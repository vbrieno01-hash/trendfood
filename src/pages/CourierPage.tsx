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
import { Bike, MapPin, DollarSign, Package, CheckCircle2, Clock, Navigation } from "lucide-react";
import {
  getSavedCourierId,
  useMyCourier,
  useRegisterCourier,
  useAvailableDeliveries,
  useMyDeliveries,
  useAcceptDelivery,
  useCompleteDelivery,
  type Delivery,
} from "@/hooks/useCourier";

const CourierPage = () => {
  const [searchParams] = useSearchParams();
  const orgSlug = searchParams.get("org") || "";
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [notFound, setNotFound] = useState(false);

  // Registration form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");

  const courierId = getSavedCourierId();
  const { data: courier, isLoading: courierLoading } = useMyCourier();
  const registerMutation = useRegisterCourier();
  const { data: available = [], isLoading: availableLoading } = useAvailableDeliveries(orgId ?? undefined);
  const { data: myDeliveries = [] } = useMyDeliveries(courierId);
  const acceptMutation = useAcceptDelivery();
  const completeMutation = useCompleteDelivery();

  // Fetch org by slug
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
        }
      });
  }, [orgSlug]);

  if (!orgSlug) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-6">
            <Bike className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-lg font-bold mb-2">Painel do Motoboy</h1>
            <p className="text-sm text-muted-foreground">
              Acesse com o link fornecido pela loja: <code>/motoboy?org=SLUG</code>
            </p>
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
        await registerMutation.mutateAsync({
          organization_id: orgId,
          name: name.trim(),
          phone: phone.trim(),
          plate: plate.trim().toUpperCase(),
        });
        toast.success("Cadastro realizado com sucesso!");
      } catch {
        toast.error("Erro ao cadastrar. Tente novamente.");
      }
    };

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
                <Label htmlFor="plate">Placa da moto</Label>
                <Input id="plate" value={plate} onChange={(e) => setPlate(e.target.value.replace(/[^A-Za-z0-9]/g, ""))} placeholder="ABC1D23" maxLength={7} required />
                <p className="text-xs text-muted-foreground">Formato: ABC1D23 (7 caracteres)</p>
              </div>
              <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </form>
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
      await acceptMutation.mutateAsync({ deliveryId: delivery.id, courierId });
      toast.success("Entrega aceita! Boa corrida 🏍️");
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">{orgName}</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{courier?.name}</p>
            <p className="text-xs font-mono text-muted-foreground">{courier?.plate}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4">
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available" className="gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Disponíveis ({available.length})
            </TabsTrigger>
            <TabsTrigger value="mine" className="gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              Minhas ({myDeliveries.length})
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
                <Card key={d.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Pedido</p>
                        <p className="font-mono text-sm font-medium">#{d.order_id.slice(0, 8)}</p>
                      </div>
                      <Badge variant="secondary">Pendente</Badge>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-sm">{d.customer_address}</p>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      {d.distance_km != null && (
                        <span className="text-muted-foreground">
                          📏 {d.distance_km.toFixed(1)} km
                        </span>
                      )}
                      {d.fee != null && (
                        <span className="font-semibold text-primary flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          R$ {d.fee.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={() => handleAccept(d)}
                      className="w-full"
                      disabled={acceptMutation.isPending}
                    >
                      <Bike className="w-4 h-4 mr-2" />
                      Aceitar Entrega
                    </Button>
                  </CardContent>
                </Card>
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
                <Card key={d.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Pedido</p>
                        <p className="font-mono text-sm font-medium">#{d.order_id.slice(0, 8)}</p>
                      </div>
                      <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Em rota</Badge>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-sm">{d.customer_address}</p>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      {d.fee != null && (
                        <span className="font-semibold text-primary">
                          R$ {d.fee.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={() => handleComplete(d.id)}
                      variant="outline"
                      className="w-full border-green-500/30 text-green-600 hover:bg-green-500/10"
                      disabled={completeMutation.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Marcar como Entregue
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CourierPage;
