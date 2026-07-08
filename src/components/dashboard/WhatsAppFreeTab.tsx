import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, QrCode, CheckCircle2, PowerOff, Gift, Timer, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Props {
  orgId: string;
}

interface FreeInstance {
  id: string;
  organization_id: string;
  instance_name: string | null;
  instance_token: string | null;
  status: string;
  phone_connected: string | null;
  connected_at: string | null;
  trial_started_at: string | null;
  trial_expires_at: string | null;
  trial_expired: boolean;
}

const TRIAL_HOURS = 2;

export default function WhatsAppFreeTab({ orgId }: Props) {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [instance, setInstance] = useState<FreeInstance | null>(null);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  const refresh = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/uazapi-free-instance-status?organization_id=${orgId}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } },
      );
      const data = await res.json();
      if (data.ok) {
        setInstance(data.instance as FreeInstance);
        if (data.qrcode) setQrcode(data.qrcode);
        else if (data.instance?.status === "connected") setQrcode(null);
      }
    } catch (e) {
      console.error("[wa-free] status error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    refresh();
    const t = setInterval(() => setNow(Date.now()), 1000);
    const p = setInterval(refresh, 5000);
    return () => { clearInterval(t); clearInterval(p); };
     
  }, [orgId]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/uazapi-free-create-instance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ organization_id: orgId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.error === "free_trial_expired") {
          toast.error("Seu trial de 2h já foi usado.");
        } else {
          toast.error(data.message || data.error || "Erro ao conectar");
        }
        return;
      }
      if (data.qrcode) setQrcode(data.qrcode);
      if (data.instance) setInstance(data.instance);
      toast.success("Escaneie o QR no WhatsApp!");
    } catch (e) {
      toast.error("Erro de rede: " + (e as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Desconectar o WhatsApp grátis? Você pode reconectar até o trial expirar.")) return;
    setDisconnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/uazapi-free-disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ organization_id: orgId, delete_instance: false }),
      });
      toast.success("Desconectado.");
      setQrcode(null);
      await refresh();
    } finally {
      setDisconnecting(false);
    }
  };

  const remainingMs = useMemo(() => {
    if (!instance?.trial_expires_at) return null;
    return Math.max(0, new Date(instance.trial_expires_at).getTime() - now);
  }, [instance?.trial_expires_at, now]);

  const remainingLabel = useMemo(() => {
    if (remainingMs === null) return null;
    const totalSec = Math.floor(remainingMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [remainingMs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Trial expirado → tela de upgrade
  if (instance?.trial_expired) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" /> WhatsApp Grátis
          </h2>
          <p className="text-sm text-muted-foreground">Seu trial de 2h já foi usado.</p>
        </div>
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="py-10 text-center space-y-4">
            <div className="text-6xl">🚀</div>
            <h3 className="text-lg font-bold">Trial gratuito finalizado</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Você experimentou 2 horas do robô do WhatsApp de graça. Para manter o atendimento automático ilimitado, assine o plano Pro.
            </p>
            <Button asChild size="lg" className="bg-primary">
              <Link to="/dashboard?tab=subscription">
                <Sparkles className="h-4 w-4 mr-2" /> Assinar Pro — ilimitado
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isConnected = instance?.status === "connected" || instance?.status === "open";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" /> WhatsApp Grátis
            <Badge className="bg-emerald-500 text-white">TRIAL {TRIAL_HOURS}h</Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            Conecte seu WhatsApp e teste o robô de atendimento por {TRIAL_HOURS} horas, sem cartão. Depois, assine Pro para liberar ilimitado.
          </p>
        </div>
        {isConnected && remainingLabel && (
          <Card className="border-primary/30">
            <CardContent className="py-3 px-4 flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Tempo restante:</span>
              <span className="font-mono font-bold text-primary">{remainingLabel}</span>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardContent className="py-6 space-y-4">
          {isConnected ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <div>
                <p className="font-semibold">Conectado</p>
                {instance?.phone_connected && (
                  <p className="text-sm text-muted-foreground">Número: +{instance.phone_connected}</p>
                )}
              </div>
              <Button variant="outline" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PowerOff className="h-4 w-4 mr-2" />}
                Desconectar
              </Button>
            </div>
          ) : qrcode ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">Abra o WhatsApp no seu celular → Aparelhos conectados → Conectar aparelho → escaneie:</p>
              <img
                src={qrcode.startsWith("data:") ? qrcode : `data:image/png;base64,${qrcode}`}
                alt="QR Code"
                className="w-64 h-64 mx-auto rounded-lg border bg-white p-2"
              />
              <p className="text-xs text-muted-foreground">O QR expira em alguns segundos. Se sumir, clique em "Gerar novo QR".</p>
              <Button variant="outline" size="sm" onClick={handleConnect} disabled={connecting}>
                {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                Gerar novo QR
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4 py-6">
              <QrCode className="h-12 w-12 text-primary mx-auto" />
              <div>
                <p className="font-semibold">Ative agora seu robô grátis de {TRIAL_HOURS} horas</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Ao escanear o QR, começa a contagem de {TRIAL_HOURS} horas. Depois disso, é preciso assinar Pro para continuar.
                </p>
              </div>
              <Button onClick={handleConnect} disabled={connecting} size="lg" className="bg-primary">
                {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                Conectar Grátis
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Quer robô ilimitado, sem contador?</p>
            <p className="text-muted-foreground">
              O plano Pro dá WhatsApp 24/7, sem trial de tempo. <Link to="/dashboard?tab=subscription" className="text-primary underline">Ver planos</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}