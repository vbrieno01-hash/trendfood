import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Check, X, Clock, Loader2, MessageSquare, HandCoins } from "lucide-react";

interface Dispute {
  id: string;
  dispute_id: string;
  ifood_order_id: string;
  order_id: string | null;
  organization_id: string;
  status: string;
  type: string | null;
  message: string | null;
  customer_request: any;
  expires_at: string | null;
  created_at: string;
}

function useCountdown(target?: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return "Expirado";
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function DisputeCard({ d, onAction }: { d: Dispute; onAction: () => void }) {
  const countdown = useCountdown(d.expires_at);
  const expired = countdown === "Expirado";
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [altOpen, setAltOpen] = useState(false);
  const [altMinutes, setAltMinutes] = useState("");
  const [altAmount, setAltAmount] = useState("");
  const [altBusy, setAltBusy] = useState(false);

  const respond = async (action: "accept" | "reject" | "alternative", extra: Record<string, any> = {}) => {
    try {
      const { data, error } = await supabase.functions.invoke("ifood-handshake-respond", {
        body: {
          dispute_id: d.dispute_id,
          organization_id: d.organization_id,
          action,
          ...extra,
        },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success(
        action === "accept" ? "Disputa aceita no iFood" :
        action === "reject" ? "Disputa recusada no iFood" :
        "Alternativa enviada ao cliente"
      );
      onAction();
    } catch (e: any) {
      toast.error("Falha: " + (e?.message || "erro"));
    }
  };

  const handleAccept = async () => { setBusy("accept"); try { await respond("accept"); } finally { setBusy(null); } };
  const handleReject = async () => { setBusy("reject"); try { await respond("reject"); } finally { setBusy(null); } };
  const handleAlt = async () => {
    setAltBusy(true);
    try {
      const extra: Record<string, any> = {};
      if (altMinutes) extra.additional_time_minutes = Number(altMinutes);
      if (altAmount) extra.alternative_amount = Number(altAmount);
      await respond("alternative", extra);
      setAltOpen(false);
      setAltMinutes("");
      setAltAmount("");
    } finally { setAltBusy(false); }
  };

  return (
    <Card className={`border-2 ${expired ? "border-muted" : "border-orange-300 bg-orange-50/40"}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" /> Negociação iFood
              </Badge>
              {d.type && <Badge variant="outline">{d.type}</Badge>}
            </div>
            <p className="text-xs font-mono text-muted-foreground truncate">
              Pedido: {d.ifood_order_id}
            </p>
          </div>
          <div className={`flex items-center gap-1 text-sm font-bold ${expired ? "text-muted-foreground" : "text-orange-700"}`}>
            <Clock className="w-4 h-4" />
            {countdown ?? "—"}
          </div>
        </div>

        {d.message && (
          <div className="flex items-start gap-2 text-sm bg-white border rounded-md p-2">
            <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="text-foreground">{d.message}</p>
          </div>
        )}

        <div className="flex gap-2 flex-wrap pt-1">
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700 text-white gap-1"
            disabled={!!busy || expired}
            onClick={handleAccept}
          >
            {busy === "accept" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Aceitar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50 gap-1"
            disabled={!!busy || expired}
            onClick={handleReject}
          >
            {busy === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
            Recusar
          </Button>

          <Dialog open={altOpen} onOpenChange={setAltOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1" disabled={!!busy || expired}>
                <HandCoins className="w-3.5 h-3.5" />
                Propor alternativa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Propor alternativa ao cliente</DialogTitle>
                <DialogDescription>
                  Ofereça tempo extra de preparo ou um reembolso parcial. Preencha apenas o que se aplica.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label>Tempo extra (minutos)</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Ex: 10"
                    value={altMinutes}
                    onChange={(e) => setAltMinutes(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Reembolso parcial (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Ex: 5.00"
                    value={altAmount}
                    onChange={(e) => setAltAmount(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAltOpen(false)} disabled={altBusy}>
                  Cancelar
                </Button>
                <Button onClick={handleAlt} disabled={altBusy || (!altMinutes && !altAmount)}>
                  {altBusy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  Enviar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-[10px] text-muted-foreground pt-1">
          Aberta em {new Date(d.created_at).toLocaleString("pt-BR")}
          {d.expires_at && ` · Expira em ${new Date(d.expires_at).toLocaleString("pt-BR")}`}
        </p>
      </CardContent>
    </Card>
  );
}

export default function IFoodDisputesPanel({ orgId }: { orgId: string }) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("ifood_disputes" as any)
      .select("*")
      .eq("organization_id", orgId)
      .eq("status", "open")
      .order("created_at", { ascending: false });
    setDisputes((data || []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`ifood-disputes-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ifood_disputes", filter: `organization_id=eq.${orgId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (loading) return null;
  if (disputes.length === 0) return null;

  return (
    <Card className="border-orange-300">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          Negociações iFood pendentes
          <Badge className="bg-orange-600 text-white">{disputes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {disputes.map((d) => (
          <DisputeCard key={d.id} d={d} onAction={load} />
        ))}
      </CardContent>
    </Card>
  );
}